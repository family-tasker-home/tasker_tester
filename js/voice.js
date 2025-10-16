// ===== VOICE COMMUNICATION SYSTEM =====
// Голосове спілкування з Джарвісом в реальному часі

// Стан голосового чату
let isVoiceActive = false;
let mediaRecorder = null;
let audioChunks = [];
let audioContext = null;
let analyser = null;
let voiceAnimationFrame = null;
let currentStream = null;

// API ключі для голосового режиму (6-10)
const VOICE_API_KEY_START = 5; // Індекс 5 = ключ 6
const VOICE_API_KEY_END = 9;   // Індекс 9 = ключ 10

// Отримати випадковий ключ для голосового режиму
function getVoiceApiKeyIndex() {
    return Math.floor(Math.random() * (VOICE_API_KEY_END - VOICE_API_KEY_START + 1)) + VOICE_API_KEY_START;
}

// Ініціалізація голосової системи
window.initVoiceSystem = function() {
    console.log('🎤 Ініціалізація голосової системи...');
    
    // Перевірка підтримки браузера
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('❌ Браузер не підтримує доступ до мікрофона');
        return false;
    }
    
    // Перевірка Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('⚠️ Web Speech API не підтримується');
    }
    
    console.log('✅ Голосова система готова');
    return true;
};

// Старт голосової розмови
window.startVoiceChat = async function() {
    if (isVoiceActive) {
        console.log('⚠️ Голосовий чат вже активний');
        return;
    }
    
    try {
        console.log('🎤 Запуск голосового чату...');
        
        // Запитуємо доступ до мікрофона
        currentStream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            } 
        });
        
        // Створюємо MediaRecorder
        mediaRecorder = new MediaRecorder(currentStream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        // Налаштовуємо аудіо контекст для візуалізації
        setupAudioVisualization(currentStream);
        
        // Обробники подій MediaRecorder
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = async () => {
            console.log('🎤 Запис завершено');
            await processVoiceInput();
        };
        
        // Оновлюємо UI
        isVoiceActive = true;
        updateVoiceUI(true);
        
        // Початкове повідомлення від Джарвіса
        await speakText('Привіт! Я вас слухаю. Говоріть після сигналу.');
        
        // Короткий сигнал що можна говорити
        playBeep();
        
        // Запускаємо запис
        audioChunks = [];
        mediaRecorder.start();
        
        console.log('✅ Голосовий чат активовано');
        
        // Автоматична зупинка через 30 секунд (можна збільшити)
        setTimeout(() => {
            if (isVoiceActive && mediaRecorder && mediaRecorder.state === 'recording') {
                stopVoiceRecording();
            }
        }, 30000);
        
    } catch (error) {
        console.error('❌ Помилка доступу до мікрофона:', error);
        showVoiceError('Не вдалося отримати доступ до мікрофона. Перевірте дозволи браузера.');
        stopVoiceChat();
    }
};

// Зупинка запису (але не виходу з режиму)
function stopVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// Зупинка голосової розмови
window.stopVoiceChat = function() {
    console.log('🛑 Зупинка голосового чату...');
    
    // Зупиняємо запис
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
    
    // Закриваємо потік
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    // Зупиняємо візуалізацію
    if (voiceAnimationFrame) {
        cancelAnimationFrame(voiceAnimationFrame);
        voiceAnimationFrame = null;
    }
    
    if (audioContext) {
        audioContext.close();
        audioContext = null;
    }
    
    // Оновлюємо стан
    isVoiceActive = false;
    mediaRecorder = null;
    audioChunks = [];
    
    // Оновлюємо UI
    updateVoiceUI(false);
    
    console.log('✅ Голосовий чат зупинено');
};

// Налаштування візуалізації аудіо
function setupAudioVisualization(stream) {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 256;
        source.connect(analyser);
        
        // Запускаємо анімацію
        visualizeAudio();
    } catch (error) {
        console.error('❌ Помилка налаштування візуалізації:', error);
    }
}

// Візуалізація аудіо
function visualizeAudio() {
    if (!analyser || !isVoiceActive) return;
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const draw = () => {
        if (!isVoiceActive) return;
        
        voiceAnimationFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        
        // Обчислюємо середній рівень
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Оновлюємо візуалізацію
        updateVisualization(average);
    };
    
    draw();
}

// Оновлення візуалізації рівня звуку
function updateVisualization(level) {
    const voiceIndicator = document.querySelector('.voice-level-indicator');
    if (!voiceIndicator) return;
    
    const normalized = Math.min(level / 128, 1);
    const bars = voiceIndicator.querySelectorAll('.voice-bar');
    
    bars.forEach((bar, index) => {
        const threshold = index / bars.length;
        if (normalized > threshold) {
            bar.style.opacity = '1';
            bar.style.backgroundColor = normalized > 0.7 ? '#4CAF50' : '#cc5500';
        } else {
            bar.style.opacity = '0.2';
        }
    });
}

// Обробка голосового вводу
async function processVoiceInput() {
    if (audioChunks.length === 0) {
        console.warn('⚠️ Немає аудіо даних');
        await speakText('Я нічого не почув. Спробуйте ще раз.');
        
        // Перезапускаємо запис якщо режим активний
        if (isVoiceActive) {
            setTimeout(() => {
                audioChunks = [];
                if (mediaRecorder) {
                    mediaRecorder.start();
                    playBeep();
                }
            }, 2000);
        }
        return;
    }
    
    try {
        console.log('🎤 Обробка аудіо...');
        
        // Показуємо індикатор обробки
        showProcessingIndicator(true);
        
        // Створюємо blob з аудіо
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        
        // Конвертуємо в base64
        const base64Audio = await blobToBase64(audioBlob);
        
        // Використовуємо випадковий ключ для голосового режиму (6-10)
        const voiceApiIndex = getVoiceApiKeyIndex();
        console.log(`🔑 Використовуємо голосовий API ключ #${voiceApiIndex + 1}`);
        
        // Відправляємо на розпізнавання через Gemini
        const text = await speechToText(base64Audio, voiceApiIndex);
        
        if (!text || text.trim() === '') {
            console.warn('⚠️ Текст не розпізнано');
            await speakText('Вибачте, я не розібрав що ви сказали. Повторіть будь ласка.');
            
            // Перезапускаємо запис
            if (isVoiceActive) {
                setTimeout(() => {
                    audioChunks = [];
                    if (mediaRecorder) {
                        mediaRecorder.start();
                        playBeep();
                    }
                }, 2000);
            }
            return;
        }
        
        console.log('📝 Розпізнаний текст:', text);
        
        // Додаємо повідомлення користувача в чат
        addVoiceMessageToChat(text, 'user');
        
        // Отримуємо відповідь від AI
        const response = await getAIResponse(text, voiceApiIndex);
        
        // Додаємо відповідь в чат
        addVoiceMessageToChat(response, 'assistant');
        
        // Озвучуємо відповідь
        await speakText(response);
        
        showProcessingIndicator(false);
        
        // Перезапускаємо запис якщо режим активний
        if (isVoiceActive) {
            setTimeout(() => {
                audioChunks = [];
                if (mediaRecorder) {
                    mediaRecorder.start();
                    playBeep();
                }
            }, 1000);
        }
        
    } catch (error) {
        console.error('❌ Помилка обробки голосу:', error);
        showVoiceError('Помилка обробки голосового вводу');
        showProcessingIndicator(false);
        
        // Перезапускаємо запис при помилці
        if (isVoiceActive) {
            setTimeout(() => {
                audioChunks = [];
                if (mediaRecorder) {
                    mediaRecorder.start();
                }
            }, 2000);
        }
    }
}

// Розпізнавання мови через Gemini API
async function speechToText(base64Audio, apiKeyIndex) {
    try {
        const endpoint = typeof API_ENDPOINT !== 'undefined' && API_ENDPOINT 
            ? API_ENDPOINT 
            : '/api/gemini';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        {
                            text: "Будь ласка, розпізнай та транскрибуй українською мовою що говорить людина в аудіо файлі. Відповідь має містити ТІЛЬКИ розпізнаний текст, без додаткових коментарів або пояснень."
                        },
                        {
                            inline_data: {
                                mime_type: "audio/webm",
                                data: base64Audio.split(',')[1]
                            }
                        }
                    ]
                }],
                apiKeyIndex: apiKeyIndex,
                generationConfig: {
                    temperature: 0.1,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024,
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        
        return text.trim();
    } catch (error) {
        console.error('❌ Помилка розпізнавання мови:', error);
        throw error;
    }
}

// Отримання відповіді від AI
async function getAIResponse(text, apiKeyIndex) {
    try {
        // Будуємо контекст як у звичайному чаті
        const contents = [];
        
        // Додаємо системний промпт
        if (JARVIS_PROMPT) {
            const currentData = getCurrentSiteData();
            contents.push({
                role: 'user',
                parts: [{ text: `${JARVIS_PROMPT}\n\n=== ПОТОЧНІ ДАНІ ===\n${currentData}\n\nВажливо: Відповідай КОРОТКО та ЗРОЗУМІЛО, це голосова розмова.` }]
            });
            
            contents.push({
                role: 'model',
                parts: [{ text: 'Зрозумів! Відповідатиму коротко та чітко.' }]
            });
        }
        
        // Додаємо повідомлення користувача
        contents.push({
            role: 'user',
            parts: [{ text: text }]
        });
        
        const endpoint = typeof API_ENDPOINT !== 'undefined' && API_ENDPOINT 
            ? API_ENDPOINT 
            : '/api/gemini';
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contents,
                apiKeyIndex: apiKeyIndex,
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 512,
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Вибачте, не зрозумів';
        
        // Очищаємо від markdown
        aiResponse = cleanMarkdown(aiResponse);
        
        // Виконуємо команди якщо є
        const commandsExecuted = executeCommands(aiResponse);
        
        // Видаляємо команди з тексту
        commandsExecuted.forEach(cmd => {
            aiResponse = aiResponse.replace(cmd.original, '');
        });
        
        return aiResponse.trim();
    } catch (error) {
        console.error('❌ Помилка отримання відповіді AI:', error);
        return 'Вибачте, виникла помилка зв\'язку.';
    }
}

// Озвучення тексту через Web Speech API
async function speakText(text) {
    return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
            console.warn('⚠️ Speech Synthesis не підтримується');
            resolve();
            return;
        }
        
        // Зупиняємо попереднє озвучення
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Налаштування голосу
        const voices = window.speechSynthesis.getVoices();
        const ukrainianVoice = voices.find(voice => voice.lang.startsWith('uk'));
        
        if (ukrainianVoice) {
            utterance.voice = ukrainianVoice;
        }
        
        utterance.lang = 'uk-UA';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
            console.log('✅ Озвучення завершено');
            resolve();
        };
        
        utterance.onerror = (error) => {
            console.error('❌ Помилка озвучення:', error);
            resolve();
        };
        
        window.speechSynthesis.speak(utterance);
    });
}

// Конвертація blob в base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Додавання повідомлення в чат
function addVoiceMessageToChat(message, sender) {
    const chatContainer = document.getElementById('chatMessages');
    if (!chatContainer) return;
    
    const messageElement = createMessageElement(message, sender);
    chatContainer.appendChild(messageElement);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Оновлення UI голосового режиму
function updateVoiceUI(isActive) {
    const voiceBtn = document.querySelector('.voice-chat-btn');
    const voicePanel = document.querySelector('.voice-chat-panel');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.querySelector('.chat-send-btn');
    
    if (!voiceBtn || !voicePanel) return;
    
    if (isActive) {
        voiceBtn.classList.add('active');
        voicePanel.style.display = 'flex';
        if (chatInput) chatInput.disabled = true;
        if (sendBtn) sendBtn.disabled = true;
    } else {
        voiceBtn.classList.remove('active');
        voicePanel.style.display = 'none';
        if (chatInput) chatInput.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
    }
}

// Показ індикатора обробки
function showProcessingIndicator(show) {
    const indicator = document.querySelector('.voice-processing');
    if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
    }
}

// Показ помилки
function showVoiceError(message) {
    const chatContainer = document.getElementById('chatMessages');
    if (chatContainer) {
        const errorElement = createMessageElement(`❌ ${message}`, 'assistant');
        chatContainer.appendChild(errorElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Звуковий сигнал
function playBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

// Ініціалізація при завантаженні
document.addEventListener('DOMContentLoaded', function() {
    window.initVoiceSystem();
});

console.log('✅ Voice communication system завантажено');
