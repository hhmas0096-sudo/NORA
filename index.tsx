
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

// Helper to call our proxy
const callApi = async (body: any) => {
    const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorBody = await response.json();
        console.error("API Error:", errorBody);
        throw new Error(`API request failed with status ${response.status}`);
    }

    return response.json();
};

// --- Helper function to calculate a darker shade of a color ---
const shadeColor = (color: string, percent: number): string => {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(String(R * (100 + percent) / 100));
    G = parseInt(String(G * (100 + percent) / 100));
    B = parseInt(String(B * (100 + percent) / 100));

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    const RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
};


// --- Main App Component ---
const App = () => {
  const [activePage, setActivePage] = useState('chat');
  const [apiReady, setApiReady] = useState(true); // Assume ready, update on error
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    // --- Theme Management ---
    const applyTheme = () => {
        // Mode
        const themeMode = localStorage.getItem('themeMode') || 'auto';
        if (themeMode === 'dark' || (themeMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        
        // Color
        const themeColor = localStorage.getItem('themeColor') || '#B89F71';
        const darkColor = shadeColor(themeColor, -20);
        document.documentElement.style.setProperty('--primary-color', themeColor);
        document.documentElement.style.setProperty('--primary-dark', darkColor);

        // Background
        const themeBackground = localStorage.getItem('themeBackground') || 'default';
        if (themeBackground !== 'default') {
            document.documentElement.style.setProperty('--background-image', `url(${themeBackground})`);
            document.documentElement.style.setProperty('--background-size', 'auto');
            document.documentElement.style.setProperty('--background-repeat', 'repeat');
        } else {
             document.documentElement.style.removeProperty('--background-image');
             document.documentElement.style.removeProperty('--background-size');
             document.documentElement.style.removeProperty('--background-repeat');
        }
    };
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
        const themeMode = localStorage.getItem('themeMode') || 'auto';
        if (themeMode === 'auto') {
            applyTheme();
        }
    };
    mediaQuery.addEventListener('change', handleChange);
    
    // --- Notification Management ---
    const manageMotivationalNotifications = () => {
        if (!('Notification' in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        const LAST_VISIT_KEY = 'lastVisitTimestamp';
        const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
        const now = new Date().getTime();
        const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
        const wasInactive = lastVisit && (now - parseInt(lastVisit, 10) > TWENTY_FOUR_HOURS_MS);

        const showNotification = () => {
            const motivationalMessages = [
                "أهلاً بعودتك! هل أنت مستعد لجلسة دراسية مثمرة اليوم؟",
                "لقد اشتقنا إليك! لنبدأ رحلة التعلم من جديد.",
                "العلم ينتظرك! ما الذي تود اكتشافه في التطبيق اليوم؟",
                "يوم جديد، فرصة جديدة للتعلم. نحن هنا لمساعدتك."
            ];
            const randomMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
            
            new Notification('تطبيق الطالب السوري', {
                body: randomMessage,
                icon: 'https://i.imgur.com/gL342tY.png' // Book icon
            });
        };

        if (Notification.permission === 'granted') {
            if (wasInactive) {
                showNotification();
            }
        } else if (Notification.permission === 'default') {
            const requestPermission = () => {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted' && wasInactive) {
                        showNotification();
                    }
                });
            };

            // If user is returning after inactivity, ask for permission right away.
            // Otherwise, delay the request to be less intrusive for new users.
            if (wasInactive) {
                requestPermission();
            } else {
                setTimeout(requestPermission, 5000); // 5-second delay for new users
            }
        }
        
        // Always update the last visit timestamp
        localStorage.setItem(LAST_VISIT_KEY, now.toString());
    };

    manageMotivationalNotifications();
    
    return () => mediaQuery.removeEventListener('change', handleChange);
}, []);


  const renderPage = () => {
    if (!apiReady) {
        return <div className="page"><div className="header"><h1>خطأ</h1></div><div className="error-message">لم يتمكن التطبيق من الاتصال بالخادم. قد يكون مفتاح API غير صحيح أو مفقود في إعدادات Netlify.</div></div>;
    }

    switch (activePage) {
      case 'chat':
        return <ChatPage messages={chatHistory} setMessages={setChatHistory} />;
      case 'books':
        return <BooksPage />;
      case 'tools':
        return <ToolsPage />;
      case 'suggestions':
        return <SuggestionsPage />;
      default:
        return <ChatPage messages={chatHistory} setMessages={setChatHistory} />;
    }
  };

  return (
    <>
      <div className="app-container">
        <div className="top-bar"></div>
        <main className="content-container">
            {renderPage()}
        </main>
        <BottomNav activePage={activePage} setActivePage={setActivePage} />
      </div>
    </>
  );
};

// --- Bottom Navigation Component ---
const BottomNav = ({ activePage, setActivePage }) => {
    const navRef = useRef<HTMLDivElement>(null);
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const audioCtxRef = useRef<AudioContext | null>(null);

    // --- Sound Effect Function ---
    const playClickSound = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const audioCtx = audioCtxRef.current;
        
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        // Sound parameters for a short "click"
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch

        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.1);
    };

    const navItems = [
        { id: 'chat', icon: 'chat_bubble', label: 'الدردشة' },
        { id: 'books', icon: 'menu_book', label: 'الكتب' },
        { id: 'tools', icon: 'apps', label: 'الأدوات' },
        { id: 'suggestions', icon: 'lightbulb', label: 'الاقتراحات' },
    ];

    useEffect(() => {
        const activeElement = navRef.current?.querySelector('.nav-button.active') as HTMLElement;
        if (activeElement) {
            const indicatorWidth = 36; // From CSS
            const left = activeElement.offsetLeft + activeElement.offsetWidth / 2 - indicatorWidth / 2;
            setIndicatorStyle({ left: `${left}px`, width: `${indicatorWidth}px` });
        }
    }, [activePage, navItems.length]);

    const handleNavClick = (pageId: string) => {
        playClickSound();
        setActivePage(pageId);
    };

    return (
        <nav className="bottom-nav" ref={navRef}>
            <div className="nav-indicator" style={indicatorStyle}></div>
            {navItems.map((item) => (
                <button
                    key={item.id}
                    className={`nav-button ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    aria-label={item.label}
                >
                    <span className="material-icons">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
};

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error('Failed to read file as a data URL string.'));
        }
    };
    reader.onerror = error => reject(error);
});

// --- Markdown Renderer ---
const MarkdownRenderer = ({ text }) => {
    const toHtml = (markdown) => {
        // Clean up markdown before processing
        const cleanedMarkdown = markdown.replace(/```markdown/g, '').replace(/```/g, '').trim();

        const blocks = cleanedMarkdown.split(/\n\n+/); 
        
        const html = blocks.map(block => {
            let processedBlock = block
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            processedBlock = processedBlock
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');

            if (processedBlock.match(/^\s*([-*]|\d+\.)/)) {
                // This is a list, process it line by line preserving nesting
                const lines = processedBlock.split('\n');
                let htmlList = '';
                let listStack = []; // To keep track of open lists (ul/ol)

                lines.forEach(line => {
                    if (!line.trim()) return;

                    const indentMatch = line.match(/^\s*/);
                    const indentLevel = indentMatch ? indentMatch[0].length / 2 : 0; // Assuming 2 spaces for indent
                    const content = line.trim().replace(/^([-*]|\d+\.)\s*/, '');
                    const isOrdered = /^\d+\./.test(line.trim());
                    const listType = isOrdered ? 'ol' : 'ul';

                    while (listStack.length > indentLevel) {
                        htmlList += `</${listStack.pop()}>`;
                    }

                    if (listStack.length < indentLevel || (listStack.length > 0 && listStack[listStack.length - 1] !== listType)) {
                         if (listStack.length > 0 && listStack[listStack.length - 1] !== listType && listStack.length === indentLevel) {
                            htmlList += `</${listStack.pop()}>`;
                         }
                         htmlList += `<${listType}>`;
                         listStack.push(listType);
                    }
                    
                    htmlList += `<li>${content}</li>`;
                });

                while (listStack.length > 0) {
                    htmlList += `</${listStack.pop()}>`;
                }
                return htmlList;
            }
            else {
                return `<p>${processedBlock.replace(/\n/g, '<br/>')}</p>`;
            }
        }).join('');
        return { __html: html };
    };

    return <div className="message-text-content" dangerouslySetInnerHTML={toHtml(text)} />;
};


// --- Audio Helper Functions ---
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Helper function to create a WAV file blob from an AudioBuffer
function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function createWavBlob(audioBuffer: AudioBuffer): Blob {
    const numChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const numFrames = audioBuffer.length;
    const bitsPerSample = 16;

    const dataSize = numFrames * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    const byteRate = sampleRate * blockAlign;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    // "fmt " sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // 16 for PCM
    view.setUint16(20, 1, true); // PCM is 1
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    // "data" sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    // Write the PCM data
    let offset = 44;
    for (let i = 0; i < numFrames; i++) {
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            const s = Math.max(-1, Math.min(1, channelData[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }
    }
    
    return new Blob([view], { type: 'audio/wav' });
}


// --- Chat Page Component ---
const ChatPage = ({ messages, setMessages }) => {
    interface ChatMessage {
        role: 'user' | 'model';
        text: string;
        imageFile?: File;
    }

    const [inputValue, setInputValue] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);
    const [chatSuggestions, setChatSuggestions] = useState<string[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const allSuggestions = [
        'اشرح لي قاعدة فيثاغورس',
        'لخص لي نصاً عن الثورة الصناعية',
        'كيف أكتب موضوع تعبير؟',
        'ما هي خطوات المنهج العلمي؟',
        'ترجم لي هذه الجملة: "Knowledge is power"',
        'أعطني مثالاً على التشبيه في الشعر',
        'ما هي عاصمة البرازيل؟',
        'ساعدني في فهم مسألة في الكيمياء',
        'حل لي هذه المعادلة: 2x + 5 = 15',
        'ما الفرق بين الطقس والمناخ؟',
        'اكتب لي قصيدة قصيرة عن الأمل',
        'من هو ابن خلدون؟'
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowWelcomeModal(true);
        }, 3000);
        
        const shuffled = [...allSuggestions].sort(() => 0.5 - Math.random());
        setChatSuggestions(shuffled.slice(0, 3));

        return () => clearTimeout(timer);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setImage(event.target.files[0]);
            event.target.value = null; // Reset to allow re-selecting same file
        }
    };

    const handleRemoveImage = () => {
        setImage(null);
    };
    
    const handleSendMessage = async (prompt?: string) => {
        const textToSend = (typeof prompt === 'string' ? prompt : inputValue).trim();
        const imageToSend = image;

        if (!textToSend && !imageToSend) return;

        const userMessage: ChatMessage = { role: 'user', text: textToSend, imageFile: imageToSend };
        const newMessages: ChatMessage[] = [...messages, userMessage];
        setMessages(newMessages);

        setInputValue('');
        setImage(null);
        setIsLoading(true);

        try {
            const parts: any[] = [];
            if (userMessage.text) {
                parts.push({ text: userMessage.text });
            }
            if (userMessage.imageFile) {
                const base64Data = await fileToBase64(userMessage.imageFile);
                parts.push({
                    inlineData: { mimeType: userMessage.imageFile.type, data: base64Data },
                });
            }
            
            const currentMessagePayload = { role: userMessage.role, parts };
            const contents = [currentMessagePayload];

            const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: contents,
            });

            const aiText = response.text || "عذراً، لم أتلق إجابة. الرجاء المحاولة مرة أخرى.";

            const aiMessage: ChatMessage = { role: 'model', text: aiText };
            setMessages([...newMessages, aiMessage]);

        } catch (error) {
            console.error("Error sending message:", error);
            const errorMessage: ChatMessage = { role: 'model', text: 'عذراً، حدث خطأ ما. الرجاء المحاولة مرة أخرى.' };
            setMessages([...newMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };


    const handleCloseModal = () => {
        setShowWelcomeModal(false);
    };

    return (
        <div className="page chat-page">
            {showWelcomeModal && (
                <div className="welcome-toast">
                    <div className="toast-content">
                        <h4>ملاحظة هامة</h4>
                        <p>سيتم تدريب هذا النموذج قريبًا على المنهج الدراسي السوري الحديث لتقديم إجابات أكثر دقة وتخصصًا.</p>
                    </div>
                    <button onClick={handleCloseModal} className="toast-close-btn" aria-label="إغلاق">&times;</button>
                </div>
            )}
            <div className="chat-history">
                {messages.length === 0 && !isLoading && (
                    <div className="chat-welcome-container">
                        <span className="material-icons">auto_awesome</span>
                        <h3>مرحباً بك! كيف يمكنني مساعدتك اليوم؟</h3>
                        <div className="chat-suggestions">
                            {chatSuggestions.map((suggestion, index) => (
                                <button key={index} onClick={() => handleSendMessage(suggestion)}>{suggestion}</button>
                            ))}
                        </div>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`message-bubble ${msg.role}`}>
                         {msg.imageFile && <img src={URL.createObjectURL(msg.imageFile)} alt="User upload" className="chat-image" />}
                         {msg.text && (
                           msg.role === 'model' 
                           ? <MarkdownRenderer text={msg.text} /> 
                           : <p className="message-text">{msg.text}</p>
                        )}
                    </div>
                ))}
                 {isLoading && (
                    <div className="message-bubble model">
                        <div className="loading-dots">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="chat-input-container">
                {image && (
                    <div className="image-preview-container">
                        <img src={URL.createObjectURL(image)} alt="Preview" />
                        <button onClick={handleRemoveImage} className="remove-image-btn" aria-label="Remove image">
                            <span className="material-icons">close</span>
                        </button>
                    </div>
                )}
                <div className="chat-input-area">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />
                     <button 
                        onClick={() => fileInputRef.current?.click()} 
                        disabled={isLoading} 
                        aria-label="Attach image"
                    >
                        <span className="material-icons">add_photo_alternate</span>
                    </button>
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="اكتب رسالتك هنا..."
                        aria-label="إدخال الدردشة"
                        disabled={isLoading}
                    />
                    <button 
                        onClick={() => handleSendMessage()} 
                        disabled={isLoading || (!inputValue.trim() && !image)} 
                        aria-label="إرسال رسالة"
                    >
                        <span className="material-icons">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Books Page Component ---
const BooksPage = () => {
    const [selectedStage, setSelectedStage] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(null);

    const stages = [
        {
            name: 'المرحلة الابتدائية',
            icon: 'child_care',
            grades: [
                { name: 'الصف الأول', subjects: [ { name: 'الرياضيات (الفصل الأول)', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1TnCylQZ7qKY7XEw-Qo2vr7uu-BpBC8Mj' }, { name: 'الرياضيات (الفصل الثاني)', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1pBG_bU66WtgEDRdvMBGqAH82WQP7S5qs' }, { name: 'العلوم (الفصل الأول)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1kJXYTqWrS1UhbxsilSEEqMxqRYKiiTh2' }, { name: 'العلوم (الفصل الثاني)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=16HWSu4CfllLyk6nOhje2K6q9n7DYj4an' }, { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=12unENA6S9VJQeYkbzkxRARZUvVkd8jKO' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1F0btzUkiru74_6H3n3AyMH2hLr8rIdFN' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1Hx-tv1MoTEhysqdwgRQsKhohOYEO-7ez' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1_Jra5xK8oqFUNrYXC1cDdTTvY23zutZH' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1v6cvKWgsgHRBC3qAQry8VvgGL_4TbMIm' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1ltkngUTw29rh8ZLeY7U1YFJEpV08kFb7' }, { name: 'الدراسات الاجتماعية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=12rDoiaduORslwwigbMU8Y3bcz4MlknJO' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1NiopNk0TfyYXsmBwxcpjFfOI8UHnptOQ' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=14kSTZLlSO_SKD8nk-RdqYyNJOXfYEDZR' } ] },
                { name: 'الصف الثاني', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1C41bpOxorJU6d__CNry9WohIYDTBK-np' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1bLkxtYS6ym9YsXly1HzZ83Sd6E2Ha879' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=19tfYmIMpq2M7HhY92Dep6gaWawHKwz1k' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1DDj39gMMqOcpxzLn3iOAqCrR38QlDkrR' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1HBZP5YyzoYRhAHcUEvECG2b1zjJWlqyw' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1Qdg-3kdI1X5sFRtMQk5uWZB24vRZqpbK' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1p1IlODXabxZgTDZKOH0jt2d_sr3uo7EL' }, { name: 'الرياضيات (فصل أول)', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1hc6oNsAw5PGZjuHR8RgEw8gPpNEinX3e' }, { name: 'الرياضيات (فصل ثاني)', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1VzwCLAH3tE-OAquAUGxKEO6daJWTx-TA' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1UzTuVXz3aPCAF-pAwv1-tVa07tQrEVJx' }, { name: 'العلوم (فصل أول)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1I8enxrqh3lQ0se7f66X1xZ6Uc1A0tnsN' }, { name: 'العلوم (فصل ثاني)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1GrFyNESdQC2lbnvihJaIi6GUIYxLPjCj' }, { name: 'الدراسات الاجتماعية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=18UqD5GI3BY1vW2Y7WOxaiN_OgrWWs_3U' } ] },
                { name: 'الصف الثالث', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1FH9pizdg3OszpocYdmek3wx2vb8GRTvY' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=10Nn4H-d_ejtoCN7gLGc95foomJU7WZ4w' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=1DAmEW1JiyzocDj_Sq1bkWzx7dSvlhAi8' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1-ySKgJQhLRV4paflPxZ2794ioyMyDLFp' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1MbAG0zkWkksTT_C12Quk1W5vcOKLUS9h' }, { name: 'اللغة الإنkليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1WXXgigJLQVcXeiXofgNK2Yr6g5f3ZkDK' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1o_w6WRwSpS8FZ4rmpOvu-3fG2sSYLbM2' }, { name: 'الرياضيات', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1suiqkaNtYpNTfX8XZ-j_-Z5p5iW0SaJc' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=14BfmigSiSNpgS5JUEs8A6RxleAu_d2kn' }, { name: 'العلوم (فصل أول)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=12P4Puu6pFqQ5kzK2qcveS5sVPqXkExaf' }, { name: 'العلوم (فصل ثاني)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1rmkdOF4f3gf7GwH6wEyT7Q-iRWNndKV4' }, { name: 'الدراسات الاجتماعية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1PGF2m5Yb8EPrQnqcahTOJ41BBHpg9e9T' } ] },
                { name: 'الصف الرابع', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1FSlLrQavjFa3mOhlBBQMYnANEYZxP_CV' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1dS9y-tPkjqmwX05vBQoHie7mvV0Zltiw' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=1vH99kO2NllU0gJErjz8yKO8V4HTJqtDM' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1-iYkMXv7Cxi44fLYoov32O1SCHt9dAUD' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1RTkPZ20qIqJDzzyWPWUPHKEP-vVbgTst' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=18LFhWJ3GAs2UfRFl6GRxg8PhOE8yuSwG' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1iMsviYvlR-FPO4PS9jC0C9zJwZp9tYAh' }, { name: 'الرياضيات', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1WJiivgPOF3ZEZqCQq1amPfjk15gknyko' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1vhJcLIP34kK5jWOUyrXEo3tE9Uuj_rI1' }, { name: 'العلوم (فصل أول)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1N5dIudTRW-TnXGBHekgz2hBKpVXSw4UO' }, { name: 'العلوم (فصل ثاني)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1-jhmMiyyF4yoi6bG8ZewX0KfWa7WYlia' }, { name: 'الدراسات الاجتماعية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1J0yhI_f__ugVkUI7G4Kps34IcbdfUwbE' }, { name: 'التربية المهنية (فصل أول)', icon: 'build', url: 'https://drive.google.com/uc?export=download&id=1xs6MTvUKJ16C77qmyunMzdfVwfvU8D-k' }, { name: 'التربية المهنية (فصل ثاني)', icon: 'build', url: 'https://drive.google.com/uc?export=download&id=1tUkHMqyY85AbW_ilpK4bo3yXURGDbXTd' } ] },
                { name: 'الصف الخامس', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1N8oCCbDdXJvtnzlxY-91s_YbyS3JIL4Q' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1HpXD1cdtJmVTXJOhDrRj-k3WZ9IBxvDT' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=1JDs-El1_LcvFaN5rieyhAD2A0k0Y0KLy' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=17Fetm1DbtSmXdS38fm26IVC9Vz022BVC' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=12GuG6T3qkS1aFS3GdkHKOgQibMa1DtEL' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1NkMXf8U5CMBe5ySXTiONLtSpXyF62R58' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1AtU-pZjBRfTHbTTKxqWjSeuKr1Ri4PMS' }, { name: 'الرياضيات', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1fleAPXHix4IIFDcyW5AzZf12n7whSm5e' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=17NfXszpg4Y2Ad_CP7zR-wKl4xTnO4rRB' }, { name: 'العلوم (فصل أول)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1TAPqvDo8h6k7TwQNadz1Dbvy5FOiBjpF' }, { name: 'العلوم (فصل ثاني)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1nrzBO57cezc8t5cHX0xvhhxNUqcJ6Krx' }, { name: 'التربية المهنية (فصل أول)', icon: 'build', url: 'https://drive.google.com/uc?export=download&id=1nrzBO57cezc8t5cHX0xvhhxNUqcJ6Krx' }, { name: 'التربية المهنية (فصل ثاني)', icon: 'build', url: 'https://drive.google.com/uc?export=download&id=1G0RkhXHjkA1xQCPv2JpyCoYjvDl8k9bt' } ] },
                { name: 'الصف السادس', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1xTRTBQWPJVbbRMHBZpy88ZscWM6LE_D1' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1ewPBvJN76ud-ksgw0izDCXgiKhTCk9us' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=17ZZmZanQ_yReYMoqppjuZ4fMdZjFfmXj' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1xlzBnxyBCtjZAN5Mes1E8BuAnsKq8Pyb' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1nIrt_yazEiDYwMnkvDhYMby4Y-8EVeUv' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1sWClsTGi06IMm0rDgwX0s5vnjvODXuNh' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1hNdiEkeN-Rs_-IcD0Ph3QnD8YtbcdyYb' }, { name: 'الرياضيات', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1RZi8lBYtWvdfLctwnS8rDrT6nkSunNNS' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1Z067Q0cPWH27_9ptOu6LNv-mv1yP-t9T' }, { name: 'العلوم (فصل أول)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1aDL2x3iDDYNrhDj2lL9KyzKHaFPspjdb' }, { name: 'العلوم (فصل ثاني)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1fWcI0dVDKphoOWdgwgVqPXVO9NIa3wwg' }, { name: 'الدراسات الاجتماعية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1s_83el-eE2K3u_TqHTHnF9ixh9e4EqnZ' }, { name: 'التربية المهنية (فصل أول)', icon: 'build', url: 'https://drive.google.com/uc?export=download&id=1-D5TKDomnebmR6RJF_ZAYM1FRfW4g1ca' }, { name: 'التربية المهنية (فصل ثاني)', icon: 'build', url: 'https://drive.google.com/uc?export=download&id=1YzaPg76-a82KHiiEXORYASCdVWsMiFBj' } ] },
            ]
        },
        {
            name: 'المرحلة الإعدادية',
            icon: 'history_edu',
            grades: [
                { name: 'الصف السابع', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1Xal1Skvy2pQZonQcsTTpv0OgY24wfTLb' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1jAT5TlMLgnfLy_dDlcxc0IbHnNS1XlY6' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=1x6kn0G9XlF5Z79bDNK3eReF-uyJVh7X9' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1wacKgTuPKHMzhEKVzgw49Yrm0pe1FxOC' }, { name: 'اللغة الإنكليزية (كتاب التمرين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1ypDcdSgm5zL4JBqO70ijOOpFdl6H9tlU' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1BoDnctYL5RbqMvX_mnzwzrVH0g7XjWez' }, { name: 'اللغة الفرنسية (كتاب التمرين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1DnfJKKud14PwQXQe-mdQQyqLKTD3RPF1' }, { name: 'اللغة الفرنسية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1PO5SKzSOJs9zwFmeP5chQiKkwmjlX5jU' }, { name: 'الجغرافية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1uGnLs0RQk4owpjIqwH3IaFRXfsdxUGBM' }, { name: 'التاريخ', icon: 'history_edu', url: 'https://drive.google.com/uc?export=download&id=1cdk4aviMQ4ueg61W27DOeFhTXSq2yIgj' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1-jLbRBOOiXpr4Kx-fuTa5NJCGuyOPfaH' }, { name: 'الرياضيات', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=18OWIAairt0q8eHpzcJSeiDc6CuKzQKj5' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1hPfFCTaKGtOlyTTzFMJ38pCmr36GA05L' }, { name: 'الفيزياء - الكيمياء', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1x3tWmZkaKabGN2LLk4mdnEDUVRdbWm1s' }, { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1MSLzGuoI_T4kjHN3zKRqyQMD9mEi24Pg' }, { name: 'العلوم', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1XN7ktLEk4nhtkQQ0tUIUd5t1Un2kF5CF' }, { name: 'تكنلوجية الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=18e9_0WU9WafnzbZc3D-_VugPQSJai7Je' } ] },
                { name: 'الصف الثامن', subjects: [ { name: 'اللغة العربية (فصل أول)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1Xal1Skvy2pQZonQcsTTpv0OgY24wfTLb' }, { name: 'اللغة العربية (فصل ثاني)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1jAT5TlMLgnfLy_dDlcxc0IbHnNS1XlY6' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=1x6kn0G9XlF5Z79bDNK3eReF-uyJVh7X9' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1wacKgTuPKHMzhEKVzgw49Yrm0pe1FxOC' }, { name: 'اللغة الإنكليزية (كتاب التمرين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1ypDcdSgm5zL4JBqO70ijOOpFdl6H9tlU' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1BoDnctYL5RbqMvX_mnzwzrVH0g7XjWez' }, { name: 'اللغة الفرنسية (كتاب التمرين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1DnfJKKud14PwQXQe-mdQQyqLKTD3RPF1' }, { name: 'اللغة الفرنسية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1PO5SKzSOJs9zwFmeP5chQiKkwmjlX5jU' }, { name: 'الجغرافية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1uGnLs0RQk4owpjIqwH3IaFRXfsdxUGBM' }, { name: 'التاريخ', icon: 'history_edu', url: 'https://drive.google.com/uc?export=download&id=1cdk4aviMQ4ueg61W27DOeFhTXSq2yIgj' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1-jLbRBOOiXpr4Kx-fuTa5NJCGuyOPfaH' }, { name: 'الرياضيات', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=18OWIAairt0q8eHpzcJSeiDc6CuKzQKj5' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1hPfFCTaKGtOlyTTzFMJ38pCmr36GA05L' }, { name: 'الفيزياء - الكيمياء', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1x3tWmZkaKabGN2LLk4mdnEDUVRdbWm1s' }, { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1MSLzGuoI_T4kjHN3zKRqyQMD9mEi24Pg' }, { name: 'العلوم', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1XN7ktLEk4nhtkQQ0tUIUd5t1Un2kF5CF' }, { name: 'تكنلوجية الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=18e9_0WU9WafnzbZc3D-_VugPQSJai7Je' } ] },
                { name: 'الصف التاسع', subjects: [ { name: 'الجبر', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1Q_u-zOh06EW4fdIbmugdJNhtzEs18MLP' }, { name: 'اللغة العربية', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1kYcaoNIOcs41rHa25isIn8efflvKjE0f' }, { name: 'الفنون', icon: 'palette', url: 'https://drive.google.com/uc?export=download&id=1K1FEbBloCfsZz1Xi3XoYIPR6ANCXRSxl' }, { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1qg6QMhAnm2pdGXqhbrjQi8YIoAz6_4oJ' }, { name: 'اللغة الإنكليزية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1ntZry3lT48SnVZR5YnbBbkxFSPQDj40C' }, { name: 'اللغة الإنكليزية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1_Mko_BK3N7_rBsD2wckbybKv1UEsT1NJ' }, { name: 'اللغة الفرنسية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1m3m-rhhzJ2ozhuUpv8b0Fs7YnQ11otvL' }, { name: 'اللغة الفرنسية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1_jKc0jKHXqhuBdsfplspgg6SslKzzLWP' }, { name: 'الجغرافية', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1Bwgdk_WkKp0mZtsRQ5a6Y5YXPlkF2Cck' }, { name: 'الرياضيات (هندسة)', icon: 'architecture', url: 'https://drive.google.com/uc?export=download&id=1fVY2PtoyXfkl4mtvQLv8zg7lO0rc6mKL' }, { name: 'التاريخ', icon: 'history_edu', url: 'https://drive.google.com/uc?export=download&id=1GT6iuso9gxoKMqd9zw8eju8dn9sQnMcF' }, { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1C76lDr5sEm4ai7kioWlV6JScqPoSij5O' }, { name: 'الموسيقى', icon: 'music_note', url: 'https://drive.google.com/uc?export=download&id=1TeKAMGWpKw2OOOkQLeRBECmTsJ7ahZFW' }, { name: 'فيزياء - كيمياء', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1dDJeOS8Q2wjIrfJOt1P81wVH9gSMZvHC' }, { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1L09BcmUWfc_RQ4kZmPTy8Dl51QvrzqWk' }, { name: 'العلوم', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1NtpmiZldf1X8pVMu3Ld5Uz8JuBp6zsU6' }, { name: 'تكنلوجية الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=18_4pXCrhJjmivZoNNEguRujdMeAx0_4G' } ] },
            ]
        },
        {
            name: 'المرحلة الثانوية',
            icon: 'school',
            grades: [
                { name: 'العاشر العلمي', subjects: [
                    { name: 'الرياضيات الجزء الأول', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=10_82GlLfcQ-EHAIEvdWg1IXZ9BRCdrsZ' },
                    { name: 'الرياضيات الجزء الثاني', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1A2_q9xm9dkkm-8alfCUidYQ_aCiwUjJz' },
                    { name: 'الفيزياء - علمي', icon: 'bolt', url: 'https://drive.google.com/uc?export=download&id=1vh5dtezCKhTfc0bDu1J7Fcn7BWAkjmRA' },
                    { name: 'الكيمياء - علمي', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1h5BOxXV2mhu-0Jwypc2wTE63emAJCYi3' },
                    { name: 'العلوم - علمي', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1dWZMUVxG6fKFLmvRK1KASsvEhYRE6F9r' },
                    { name: 'اللغة العربية - علمي', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=141fpcrgU0guzmn24MCPVaxnTT5wourjB' },
                    { name: 'اللغة الإنكليزية (الكتاب الرسمي - علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1KISujZ1KdKK3qod6KL2t0AwMw02VVMVY' },
                    { name: 'اللغة الإنكليزية (كتاب التمارين - علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1FFjrCzNM0mDu8DaOsU6mHPPLLXswFZ3Z' },
                    { name: 'اللغة الفرنسية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1jpeds70ImcvbEFxe9c_6nO4t91mydQIu' },
                    { name: 'اللغة الفرنسية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=107PjXxgmDF57IBCzBwFq2aqlarmtJ6iH' },
                    { name: 'الفلسفة - علمي', icon: 'psychology', url: 'https://drive.google.com/uc?export=download&id=1YF8yWNovF6Daefp5NjbvBFUiorBgCCED' },
                    { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1rno285TDnTJwA9gxAulTIRay_gbSWUHb' },
                    { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1rHXJks-PPknqRpzsr8P3LhSeUr9PEU9m' },
                    { name: 'تكنلوجية الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=1kBKcrx6nyB0OqXOSNyXFfkKGRWMq3fvs' }
                ] },
                { name: 'العاشر الأدبي', subjects: [
                    { name: 'الرياضيات - الجبر', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1JtkzV7CjGAD2yrJ_oE0no41C_7Pbcfwk'},
                    { name: 'اللغة الإنكليزية (كتاب التمارين - أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1VH_ZdrbnY9L_Q8SXZJXsiF6SjGbD_dCl' },
                    { name: 'اللغة الإنكليزية (الكتاب الرسمي - أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1uvPbBRLfOlWI2zuP5g5-q0YogyS0GImO' },
                    { name: 'اللغة الفرنسية (كتاب التمارين)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=107PjXxgmDF57IBCzBwFq2aqlarmtJ6iH' },
                    { name: 'اللغة الفرنسية (الكتاب الرسمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1jpeds70ImcvbEFxe9c_6nO4t91mydQIu' },
                    { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1rno285TDnTJwA9gxAulTIRay_gbSWUHb' },
                    { name: 'الكيمياء - أدبي', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1QLGZLJk8dqKxdLt5z650Q9-hcEqJGP60' },
                    { name: 'التاريخ - أدبي', icon: 'history_edu', url: 'https://drive.google.com/uc?export=download&id=1bceqqbou5B_eY_2myAyrqp5N0XValJoG' },
                    { name: 'الفلسفة - أدبي', icon: 'psychology', url: 'https://drive.google.com/uc?export=download&id=1GK-AKZLgcMbvVKeaJ_ttOMPoUdd6WHhD' },
                    { name: 'العلوم - أدبي', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1aaW2UDi5w6EGv4OHAHTzTr4dSh-v_d7m' },
                    { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1rHXJks-PPknqRpzsr8P3LhSeUr9PEU9m' },
                    { name: 'تكنلوجية الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=1kBKcrx6nyB0OqXOSNyXFfkKGRWMq3fvs' }
                ] },
                { name: 'الحادي عشر العلمي', subjects: [
                    { name: 'الرياضيات الجزء الأول', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=10_82GlLfcQ-EHAIEvdWg1IXZ9BRCdrsZ' },
                    { name: 'الرياضيات الجزء الثاني', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1A2_q9xm9dkkm-8alfCUidYQ_aCiwUjJz' },
                    { name: 'الفيزياء (علمي)', icon: 'bolt', url: 'https://drive.google.com/uc?export=download&id=1vh5dtezCKhTfc0bDu1J7Fcn7BWAkjmRA' },
                    { name: 'الكيمياء (علمي)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1h5BOxXV2mhu-0Jwypc2wTE63emAJCYi3' },
                    { name: 'العلوم (علمي)', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1dWZMUVxG6fKFLmvRK1KASsvEhYRE6F9r' },
                    { name: 'اللغة العربية (علمي)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=141fpcrgU0guzmn24MCPVaxnTT5wourjB' },
                    { name: 'اللغة الإنكليزية الكتاب الرسمي (علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1KISujZ1KdKK3qod6KL2t0AwMw02VVMVY' },
                    { name: 'اللغة الإنكليزية كتاب التمارين (علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1FFjrCzNM0mDu8DaOsU6mHPPLLXswFZ3Z' },
                    { name: 'اللغة الفرنسية الكتاب الرسمي', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1jpeds70ImcvbEFxe9c_6nO4t91mydQIu' },
                    { name: 'اللغة الفرنسية كتاب التمارين', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=107PjXxgmDF57IBCzBwFq2aqlarmtJ6iH' },
                    { name: 'الفلسفة (علمي)', icon: 'psychology', url: 'https://drive.google.com/uc?export=download&id=1YF8yWNovF6Daefp5NjbvBFUiorBgCCED' },
                    { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1rno285TDnTJwA9gxAulTIRay_gbSWUHb' },
                    { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1rHXJks-PPknqRpzsr8P3LhSeUr9PEU9m' },
                    { name: 'تكنولوجيا الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=1kBKcrx6nyB0OqXOSNyXFfkKGRWMq3fvs' }
                ] },
                { name: 'الحادي عشر الأدبي', subjects: [
                    { name: 'الرياضيات – الجبر', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1JtkzV7CjGAD2yrJ_oE0no41C_7Pbcfwk' },
                    { name: 'اللغة الإنكليزية كتاب التمارين (أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1VH_ZdrbnY9L_Q8SXZJXsiF6SjGbD_dCl' },
                    { name: 'اللغة الإنكليزية الكتاب الرسمي (أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1uvPbBRLfOlWI2zuP5g5-q0YogyS0GImO' },
                    { name: 'اللغة الفرنسية كتاب التمارين', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=107PjXxgmDF57IBCzBwFq2aqlarmtJ6iH' },
                    { name: 'اللغة الفرنسية الكتاب الرسمي', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1jpeds70ImcvbEFxe9c_6nO4t91mydQIu' },
                    { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1rno285TDnTJwA9gxAulTIRay_gbSWUHb' },
                    { name: 'الكيمياء (أدبي)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1QLGZLJk8dqKxdLt5z650Q9-hcEqJGP60' },
                    { name: 'التاريخ (أدبي)', icon: 'history_edu', url: 'https://drive.google.com/uc?export=download&id=1bceqqbou5B_eY_2myAyrqp5N0XValJoG' },
                    { name: 'الفلسفة (أدبي)', icon: 'psychology', url: 'https://drive.google.com/uc?export=download&id=1GK-AKZLgcMbvVKeaJ_ttOMPoUdd6WHhD' },
                    { name: 'العلوم (أدبي)', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=1aaW2UDi5w6EGv4OHAHTzTr4dSh-v_d7m' },
                    { name: 'اللغة الروسية', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1rHXJks-PPknqRpzsr8P3LhSeUr9PEU9m' },
                    { name: 'تكنولوجيا الاتصالات', icon: 'computer', url: 'https://drive.google.com/uc?export=download&id=1kBKcrx6nyB0OqXOSNyXFfkKGRWMq3fvs' }
                ] },
                { name: 'البكالوريا العلمي', subjects: [
                    { name: 'الرياضيات – الجزء الأول', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1g8stH3uLRiSW7a-4Omoir7kIhG0LzslV' },
                    { name: 'الرياضيات – الجزء الثاني', icon: 'calculate', url: 'https://drive.google.com/uc?export=download&id=1gOCVKw0M86W33kwie5q4XfPzI7bqP04f' },
                    { name: 'الفيزياء (علمي)', icon: 'bolt', url: 'https://drive.google.com/uc?export=download&id=1erPcYAQid346vQA-XdasuaiHILz_PVu9' },
                    { name: 'الكيمياء (علمي)', icon: 'science', url: 'https://drive.google.com/uc?export=download&id=1yOB2ts80WewD7ZMzfB6YQIkfSo-E9jWK' },
                    { name: 'العلوم (علمي)', icon: 'biotech', url: 'https://drive.google.com/uc?export=download&id=19KOnpbCmhztTX1cU85QAiU4kyLcXd5Gq' },
                    { name: 'اللغة العربية (علمي)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=1ZKc_xF7ePQTcrKHXp0KTxLL9dmGoZiQA' },
                    { name: 'اللغة الإنكليزية الكتاب الرسمي (علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1ngw0V9z4K-U0ciLnXsygVgWAgJGYqobE' },
                    { name: 'اللغة الإنكليزية كتاب التمارين (علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1KzmNwEXkWQ6D17xs7iznNduVcOxF1Cu7' },
                    { name: 'اللغة الفرنسية كتاب التمارين', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1NZG3g6giqFb2Vy6IZGVrvFqJwdcpvs49' },
                    { name: 'اللغة الروسية (علمي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1gBpxOQ6Bh3xmjPNu42qnHy0q3LrxdMFv' },
                    { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1h1KsJ0tumVD2EGyDUoHoFq6RvxMygfTu' },
                    { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1Aqnh37Q2qsPiq75Q_T8EFaHk_nnV5EoW' }
                ] },
                { name: 'البكالوريا الأدبي', subjects: [
                    { name: 'الفلسفة (أدبي) – الفصل الأول', icon: 'psychology', url: 'https://drive.google.com/uc?export=download&id=1Iip2B92OkTNh7hywWGy4oi4_LZK2eUz-' },
                    { name: 'الفلسفة (أدبي) – الفصل الثاني', icon: 'psychology', url: 'https://drive.google.com/uc?export=download&id=1G7ciDsP1LqkrrabngYPBetQUZSaBR8Nq' },
                    { name: 'التاريخ (أدبي)', icon: 'history_edu', url: 'https://drive.google.com/uc?export=download&id=1gkhdoqbM5s2H__Xe3ZfpZKaPE0doumrm' },
                    { name: 'الجغرافية (أدبي)', icon: 'public', url: 'https://drive.google.com/uc?export=download&id=1X2lkmFiOl5Z2r96ududL1bxOuQNRJEVN' },
                    { name: 'اللغة العربية (أدبي)', icon: 'abc', url: 'https://drive.google.com/uc?export=download&id=12DeFqKPU09whaJqn9AGnbyw_xk0qHIsz' },
                    { name: 'اللغة الإنكليزية الكتاب الرسمي (أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1fdwUu_AVuSR5zY8-i_I96A5ptB-YBceM' },
                    { name: 'اللغة الإنكليزية كتاب التمارين (أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1Yo5Tt9udqdNyKYAfOzMYwerDKr-4SMM0' },
                    { name: 'اللغة الفرنسية (أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1LnhwWm_76hNxkDGljFJhXKXbF920Fxng' },
                    { name: 'اللغة الفرنسية كتاب التمارين', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1NZG3g6giqFb2Vy6IZGVrvFqJwdcpvs49' },
                    { name: 'اللغة الروسية (أدبي)', icon: 'translate', url: 'https://drive.google.com/uc?export=download&id=1CjpRYg72dAHFQU-CReiR9NP5-6Nqbrj_' },
                    { name: 'الديانة الإسلامية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1h1KsJ0tumVD2EGyDUoHoFq6RvxMygfTu' },
                    { name: 'الديانة المسيحية', icon: 'auto_stories', url: 'https://drive.google.com/uc?export=download&id=1Aqnh37Q2qsPiq75Q_T8EFaHk_nnV5EoW' }
                ] },
            ]
        }
    ];
    
    const handleDownload = (subject) => {
        if (subject.url) {
            window.open(subject.url, '_blank');
        } else {
            alert(`جاري تحميل كتاب ${subject.name} لـ ${selectedGrade.name}... (هذه وظيفة تجريبية)`);
        }
    };

    const handleSelectStage = (stage) => {
        setSelectedStage(stage);
        setSelectedGrade(null);
    };
    
    const handleSelectGrade = (grade) => {
        setSelectedGrade(grade);
    };

    const handleGoBack = () => {
        if (selectedGrade) {
            setSelectedGrade(null);
        } else if (selectedStage) {
            setSelectedStage(null);
        }
    };

    const renderContent = () => {
        if (selectedGrade) {
            // Step 3: Show Subjects
            return (
                <div className="quiz-step-card">
                    <div className="quiz-step-header">
                        <span className="step-number">3</span>
                        <h3>الكتب المتاحة لـ {selectedGrade.name}</h3>
                    </div>
                    <div className="subjects-list">
                        {selectedGrade.subjects.map((subject, index) => (
                            <div key={index} className="subject-card">
                                <span className="material-icons subject-icon">{subject.icon}</span>
                                <span className="subject-name">{subject.name}</span>
                                <button onClick={() => handleDownload(subject)} className="download-btn">
                                    <span className="material-icons">download</span>
                                    تحميل
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        if (selectedStage) {
            // Step 2: Show Grades
            return (
                 <div className="quiz-step-card">
                    <div className="quiz-step-header">
                        <span className="step-number">2</span>
                        <h3>اختر الصف الدراسي</h3>
                    </div>
                    <div className="selection-grid">
                        {selectedStage.grades.map((grade, index) => (
                            <div key={index} className="selection-card" onClick={() => handleSelectGrade(grade)}>
                                <span className="material-icons selection-icon">school</span>
                                <h3>{grade.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        // Step 1: Show Stages
        return (
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">1</span>
                    <h3>اختر المرحلة الدراسية</h3>
                </div>
                <div className="selection-grid">
                    {stages.map((stage, index) => (
                        <div key={index} className="selection-card" onClick={() => handleSelectStage(stage)}>
                            <span className="material-icons selection-icon">{stage.icon}</span>
                            <h3>{stage.name}</h3>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="page books-page">
            <div className="header">
                 {selectedStage && (
                    <button onClick={handleGoBack} className="back-button" aria-label="العودة">
                        <span className="material-icons">arrow_forward</span>
                    </button>
                )}
                <h1>الكتب المدرسية</h1>
            </div>
             <p className="books-intro-message">
                هذه هي النسخ المعتمدة رسميًا من وزارة التربية السورية للعام الدراسي 2025-2026. نعمل باستمرار على إضافة أي كتب ناقصة.
            </p>
            {renderContent()}
        </div>
    );
};

// --- START of merged tools components ---

const SummarizerPage = () => {
    const [text, setText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [result, setResult] = useState<{ summary: string | null; error: string | null }>({ summary: null, error: null });
    const [isLoading, setIsLoading] = useState(false);
    const [summarySize, setSummarySize] = useState('متوسط'); // 'قصير', 'متوسط', 'مفصل'
    const [summaryLevel, setSummaryLevel] = useState('المستوى المدرسي'); // 'مبسط', 'المستوى المدرسي', 'أكاديمي'

    // New states for added features
    const [questions, setQuestions] = useState<any[]>([]);
    const [examples, setExamples] = useState<string | null>(null);
    const [showAnswers, setShowAnswers] = useState(false);
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
    const [isGeneratingExamples, setIsGeneratingExamples] = useState(false);
    const [isReadingAloud, setIsReadingAloud] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    
    // Refs and setup for audio playback
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    useEffect(() => {
        // Initialize AudioContext
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        // Cleanup audio source on component unmount
        return () => {
            if (audioSourceRef.current) {
                audioSourceRef.current.stop();
            }
        };
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files)]);
            event.target.value = null;
        }
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const startCamera = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                streamRef.current = stream;
                setIsCameraOpen(true);
            } catch (err) {
                console.error("Error accessing camera: ", err);
                alert("لا يمكن الوصول إلى الكاميرا. يرجى التحقق من الأذونات.");
            }
        }
    };

    useEffect(() => {
        if (isCameraOpen && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraOpen]);

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
        streamRef.current = null;
    };

    const captureFrame = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(blob => {
                if(blob) {
                    const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                    setFiles(prevFiles => [...prevFiles, file]);
                }
                stopCamera();
            }, 'image/jpeg');
        }
    };

    const handleSummarize = async () => {
        if (files.length === 0 && !text.trim()) return;
        setIsLoading(true);
        setResult({ summary: null, error: null });
        setQuestions([]);
        setExamples(null);
        setShowAnswers(false);
        setUserAnswers({});
    
        try {
            const sizeMapping = {
                'قصير': 'short, a few sentences',
                'متوسط': 'medium, a paragraph or two',
                'مفصل': 'detailed, multiple paragraphs'
            };
    
            const levelMapping = {
                'مبسط': 'in a simple style, easy for a child to understand',
                'المستوى المدرسي': 'at a high school student level',
                'أكاديمي': 'in a formal, academic style for a university student'
            };
            
            const userInstruction = text.trim() || 'Summarize the attached files.';
            const detailedPrompt = `
                Based on the provided content (text and/or files) and user instructions, generate a summary.
                Your response MUST be a single JSON object with a single key "summary".
    
                User Instructions: "${userInstruction}"
                
                Constraints for the summary:
                - Length: ${sizeMapping[summarySize]}
                - Style/Level: ${levelMapping[summaryLevel]}
            `;
            
            const parts: any[] = [{ text: detailedPrompt }];
    
            if (files.length > 0) {
                for (const file of files) {
                    if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                        const base64Data = await fileToBase64(file);
                        parts.push({
                            inlineData: { mimeType: file.type, data: base64Data },
                        });
                    }
                }
            }
    
            const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ role: 'user', parts: parts }],
                config: {
                    responseMimeType: "application/json",
                },
            });

            try {
                const parsedJson = JSON.parse(response.text);
                if (parsedJson.summary) {
                    setResult({ summary: parsedJson.summary, error: null });
                } else {
                    setResult({ summary: null, error: 'لم يتم العثور على ملخص في الاستجابة.' });
                }
            } catch (e) {
                console.error("Error parsing summary JSON:", e, "Raw text:", response.text);
                setResult({ summary: null, error: 'عذراً، لم أتمكن من معالجة طلبك. قد يكون هناك خطأ في تنسيق الاستجابة من النموذج.' });
            }
    
        } catch (error) {
            console.error("Error summarizing:", error);
            setResult({ summary: null, error: 'عذراً، حدث خطأ أثناء الاتصال بالخادم.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!result.summary) return;
        setIsGeneratingQuestions(true);
        setQuestions([]);
        setShowAnswers(false);
        setUserAnswers({});

        try {
            const promptText = `
                Based on the following text, generate 3-5 multiple-choice questions to test understanding.
                Your entire response MUST be a single JSON object with a single key "questions".
                The value for "questions" should be an array of question objects.

                Each question object must have the following properties:
                - "question": A string containing the question text.
                - "type": Always "Multiple Choice".
                - "answer": A string containing the correct answer.
                - "options": An array of 4 strings for the options. One of the options must be the correct answer.

                Please adhere strictly to this JSON format. Respond in Arabic.

                ---
                Text to analyze: "${result.summary}"
                ---
            `;
            
            const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ parts: [{ text: promptText }] }],
                config: {
                    responseMimeType: "application/json",
                },
            });

            const jsonStr = response.text.trim();
            const parsedJson = JSON.parse(jsonStr);
            setQuestions(parsedJson.questions || []);

            if (!parsedJson.questions || parsedJson.questions.length === 0) {
                 setResult(prev => ({ ...prev, error: 'لم يتمكن النموذج من إنشاء أسئلة من هذا الملخص.' }));
            }
        } catch (err) {
            console.error("Error generating questions:", err);
            setResult(prev => ({ ...prev, error: 'عذراً، حدث خطأ أثناء إنشاء الأسئلة.' }));
        } finally {
            setIsGeneratingQuestions(false);
        }
    };
    
    const handleGenerateExamples = async () => {
        if (!result.summary) return;
        setIsGeneratingExamples(true);
        setExamples(null);
        
        try {
             const promptText = `
                Based on the following summary, provide a few simple, practical examples or analogies to help explain the main concepts to a student.
                Respond directly with the examples in Arabic. Do not add any introductory or concluding phrases.

                ---
                Summary: "${result.summary}"
                ---
            `;
            
             const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ parts: [{ text: promptText }] }],
            });

            setExamples(response.text);
        } catch (err) {
            console.error("Error generating examples:", err);
            setResult(prev => ({ ...prev, error: 'عذراً، حدث خطأ أثناء إنشاء الأمثلة.' }));
        } finally {
            setIsGeneratingExamples(false);
        }
    };
    
    const handleReadSummary = async () => {
        if (!result.summary) return;

        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        setIsReadingAloud(true);
        
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }

        try {
            const ttsResponse = await fetch('/api/tts-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: result.summary, voice: 'Kore' }),
            });

            if (!ttsResponse.ok) {
                const errorBody = await ttsResponse.json();
                console.error("TTS Proxy Error:", errorBody);
                throw new Error(`TTS proxy request failed`);
            }
            
            const responseData = await ttsResponse.json();
            const audioContent = responseData.audioContent;
            
            if (audioContent && audioContextRef.current) {
                const audioBytes = decode(audioContent);
                const audioBuffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContextRef.current.destination);
                source.start();
                
                source.onended = () => {
                    audioSourceRef.current = null;
                    setIsReadingAloud(false);
                }
                audioSourceRef.current = source;

            } else {
                throw new Error("No audio content received.");
            }

        } catch (err) {
            console.error("Error in TTS:", err);
            setResult(prev => ({ ...prev, error: `حدث خطأ أثناء إنشاء الصوت: ${err.message}` }));
            setIsReadingAloud(false);
        }
    };

    const handleSelectAnswer = (questionIndex: number, option: string) => {
        if (showAnswers) return;
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: option,
        }));
    };

    let score = 0;
    if (showAnswers && questions.length > 0) {
        questions.forEach((q, index) => {
            if (userAnswers[index] === q.answer) {
                score++;
            }
        });
    }

    return (
        <>
            <div className="quiz-step-card">
                 <div className="quiz-step-header">
                    <span className="step-number">1</span>
                    <h3>أدخل المحتوى</h3>
                </div>
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="اكتب توضيحاً لما تريد من الملفات المرفقة (مثال: لخص لي هذا الكتاب)..."
                    rows={4}
                    aria-label="Instructions for summarization"
                    style={{color: 'black'}}
                ></textarea>

                {files.length > 0 && (
                    <div className="file-preview-area">
                        {files.map((file, index) => (
                            <div key={index} className={`file-preview-item ${file.type === 'application/pdf' ? 'pdf-preview' : ''}`}>
                                {file.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(file)} alt={file.name} />
                                ) : (
                                    <>
                                        <span className="material-icons">picture_as_pdf</span>
                                        <span className="file-name">{file.name}</span>
                                    </>
                                )}
                                <button onClick={() => removeFile(index)} aria-label={`إزالة ${file.name}`}>&times;</button>
                            </div>
                        ))}
                    </div>
                )}

                <div className="summarizer-controls">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        multiple
                        aria-hidden="true"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="control-btn">
                        <span className="material-icons">attach_file</span> إرفاق ملف
                    </button>
                    <button onClick={startCamera} className="control-btn">
                        <span className="material-icons">photo_camera</span> فتح الكاميرا
                    </button>
                </div>
            </div>

            {isCameraOpen && (
                <div className="camera-modal">
                    <div className="camera-view">
                        <video ref={videoRef} autoPlay playsInline aria-label="Camera feed"></video>
                        <canvas ref={canvasRef} style={{ display: 'none' }} aria-hidden="true"></canvas>
                        <div className="camera-controls">
                            <button onClick={captureFrame} className="capture-btn">التقاط صورة</button>
                            <button onClick={stopCamera} className="close-btn">إغلاق</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">2</span>
                    <h3>خصص التلخيص</h3>
                </div>
                <div className="quiz-settings-grid">
                    {/* Summary Size */}
                    <div className="setting-group">
                        <label><span className="material-icons">format_size</span> حجم التلخيص</label>
                        <div className="segmented-control">
                            <button className={summarySize === 'قصير' ? 'active' : ''} onClick={() => setSummarySize('قصير')}>قصير</button>
                            <button className={summarySize === 'متوسط' ? 'active' : ''} onClick={() => setSummarySize('متوسط')}>متوسط</button>
                            <button className={summarySize === 'مفصل' ? 'active' : ''} onClick={() => setSummarySize('مفصل')}>مفصل</button>
                        </div>
                    </div>
                    {/* Summary Level */}
                    <div className="setting-group">
                        <label><span className="material-icons">school</span> مستوى التلخيص</label>
                        <div className="segmented-control">
                            <button className={summaryLevel === 'مبسط' ? 'active' : ''} onClick={() => setSummaryLevel('مبسط')}>مبسط</button>
                            <button className={summaryLevel === 'المستوى المدرسي' ? 'active' : ''} onClick={() => setSummaryLevel('المستوى المدرسي')}>المستوى المدرسي</button>
                            <button className={summaryLevel === 'أكاديمي' ? 'active' : ''} onClick={() => setSummaryLevel('أكاديمي')}>أكاديمي</button>
                        </div>
                    </div>
                </div>
            </div>

            <button onClick={handleSummarize} disabled={isLoading || (files.length === 0 && !text.trim())} className="generate-btn">
                 <span className="material-icons">mediation</span>
                {isLoading ? 'جاري التلخيص...' : 'ابدأ التلخيص'}
            </button>

            {isLoading && <div className="loader"></div>}

            {result && (
                <div className="results-container">
                    {result.error && !result.summary && <p className="error-message">{result.error}</p>}
                    
                    {result.summary && (
                        <div className="result-section">
                            <h2>الملخص</h2>
                            <p>{result.summary}</p>

                            <div className="result-actions">
                                <button onClick={handleGenerateQuestions} disabled={isGeneratingQuestions || isGeneratingExamples || isReadingAloud} className="result-action-btn">
                                    <span className="material-icons">quiz</span>
                                    {isGeneratingQuestions ? 'لحظة...' : 'إنشاء أسئلة'}
                                </button>
                                <button onClick={handleReadSummary} disabled={isGeneratingQuestions || isGeneratingExamples || isReadingAloud} className="result-action-btn">
                                    <span className="material-icons">volume_up</span>
                                    {isReadingAloud ? 'جار التشغيل...' : 'قراءة الملخص'}
                                </button>
                                <button onClick={handleGenerateExamples} disabled={isGeneratingQuestions || isGeneratingExamples || isReadingAloud} className="result-action-btn">
                                    <span className="material-icons">lightbulb</span>
                                    {isGeneratingExamples ? 'لحظة...' : 'إنشاء أمثلة'}
                                </button>
                            </div>
                        </div>
                    )}

                    {isGeneratingQuestions && <div className="loader"></div>}
                    
                    {questions.length > 0 && (
                        <div className={`questions-container summarizer-questions ${showAnswers ? 'answers-shown' : ''}`}>
                            <h2>أسئلة من الملخص</h2>

                            {showAnswers && (
                                <div className="quiz-score-container">
                                    <h3>النتيجة: {score} / {questions.length}</h3>
                                </div>
                            )}

                            {questions.map((q, index) => (
                                <div key={index} className="question-card">
                                    <p className="question-text"><strong>{index + 1}. </strong>{q.question}</p>
                                    {q.options && (
                                        <ul className="options-list">
                                            {q.options.map((option, i) => {
                                                const isSelected = userAnswers[index] === option;
                                                const isCorrect = q.answer === option;
                                                let className = '';
                                                if (showAnswers) {
                                                    if (isCorrect) {
                                                        className = 'correct';
                                                    } else if (isSelected && !isCorrect) {
                                                        className = 'incorrect';
                                                    }
                                                } else if (isSelected) {
                                                    className = 'selected';
                                                }

                                                return (
                                                    <li
                                                        key={i}
                                                        className={className}
                                                        onClick={() => handleSelectAnswer(index, option)}
                                                    >
                                                        {option}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            ))}
                            {!showAnswers && (
                                <button onClick={() => setShowAnswers(true)} className="reveal-answers-btn">
                                     <span className="material-icons">visibility</span>
                                    إظهار الحل
                                </button>
                            )}
                        </div>
                    )}
                    
                    {isGeneratingExamples && <div className="loader"></div>}

                    {examples && (
                         <div className="result-section">
                            <h2>أمثلة توضيحية</h2>
                             <MarkdownRenderer text={examples} />
                        </div>
                    )}

                </div>
            )}
        </>
    );
};

// Add lamejs to the global scope for TypeScript
declare var lamejs: any;

// --- Text to Speech Page Component ---
const TextToSpeechPage = () => {
    const [text, setText] = useState('');
    const [image, setImage] = useState<File | null>(null);
    const [voice, setVoice] = useState('Kore'); // Kore: female, Puck: male
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState('');

    // Audio playback state
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const playbackStartTimeRef = useRef(0);
    const startOffsetRef = useRef(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize AudioContext
    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }

        // Cleanup audio source on component unmount
        return () => {
            audioSourceRef.current?.stop();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Helper to format time
    const formatTime = (timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const stopPlayback = () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.onended = null; // Prevent onended from firing on manual stop
            audioSourceRef.current.stop();
            audioSourceRef.current = null;
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        setIsPlaying(false);
    };

    // Main audio playback loop
    const tick = () => {
        if (!audioContextRef.current || !isPlaying || !audioSourceRef.current) return;
    
        const elapsed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) + startOffsetRef.current;
    
        if (audioBuffer && elapsed >= audioBuffer.duration) {
            stopPlayback();
            setCurrentTime(audioBuffer.duration);
            startOffsetRef.current = 0; // Reset for next play
        } else {
            setCurrentTime(elapsed);
            animationFrameRef.current = requestAnimationFrame(tick);
        }
    };
    
    const playAudio = (offset: number) => {
        if (!audioBuffer || !audioContextRef.current) return;
        
        stopPlayback(); // Stop any existing playback first

        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        const validOffset = Math.max(0, Math.min(offset, audioBuffer.duration));
        source.start(0, validOffset);
        
        source.onended = () => {
             // Check if the 'onended' event was triggered by the natural end of playback
             if (audioContextRef.current && playbackStartTimeRef.current > 0) {
                const manualStopThreshold = 50; // ms
                const durationPlayed = (audioContextRef.current.currentTime - playbackStartTimeRef.current) * 1000;
                const expectedDuration = (audioBuffer.duration - startOffsetRef.current) * 1000;
                if (Math.abs(durationPlayed - expectedDuration) < manualStopThreshold) {
                    stopPlayback();
                    setCurrentTime(audioBuffer.duration);
                    startOffsetRef.current = 0;
                }
            }
        };

        audioSourceRef.current = source;
        playbackStartTimeRef.current = audioContextRef.current.currentTime;
        startOffsetRef.current = validOffset;
        setIsPlaying(true);
        animationFrameRef.current = requestAnimationFrame(tick);
    };

    const pauseAudio = () => {
        if (!audioContextRef.current || !audioSourceRef.current) return;
        const newOffset = (audioContextRef.current.currentTime - playbackStartTimeRef.current) + startOffsetRef.current;
        stopPlayback();
        if (audioBuffer) {
            const validOffset = Math.max(0, Math.min(newOffset, audioBuffer.duration));
            startOffsetRef.current = validOffset; // Save position
            setCurrentTime(validOffset);
        }
    };

    const handlePlayPauseToggle = () => {
        if (audioContextRef.current?.state === 'suspended') {
            audioContextRef.current.resume();
        }
        if (isPlaying) {
            pauseAudio();
        } else {
            // If at the end, restart from beginning
            if (audioBuffer && currentTime >= audioBuffer.duration - 0.01) {
                playAudio(0);
            } else {
                playAudio(startOffsetRef.current);
            }
        }
    };

    const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioBuffer) return;
        const seekTime = parseFloat(event.target.value);
        setCurrentTime(seekTime);
        startOffsetRef.current = seekTime;
        if (isPlaying) {
            playAudio(seekTime);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setImage(event.target.files[0]);
            setText('');
            setError('');
            stopPlayback();
            setAudioBuffer(null);
            event.target.value = null;
        }
    };

    const removeImage = () => {
        setImage(null);
    };

    const handleListen = async () => {
        if (!text.trim() && !image) return;
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        stopPlayback();
        setIsLoading(true);
        setError('');
        setAudioBuffer(null);
        setCurrentTime(0);
        startOffsetRef.current = 0;
        
        let textToSpeak = text.trim();

        try {
            if (image) {
                setLoadingMessage('جاري تحليل الصورة...');
                const base64Data = await fileToBase64(image);

                const parts = [
                    { text: "Extract any text visible in this image. Respond with only the extracted text and nothing else." },
                    { inlineData: { mimeType: image.type, data: base64Data } }
                ];

                const extractionResponse = await callApi({
                    model: 'google/gemini-flash-1.5',
                    contents: [{ role: 'user', parts: parts }]
                });

                textToSpeak = extractionResponse.text;
                if(textToSpeak) {
                    setText(textToSpeak);
                } else {
                     throw new Error('لم يتم العثور على نص في الصورة.');
                }
            }

            if (!textToSpeak) {
                setError('لا يوجد نص لقراءته.');
                setIsLoading(false);
                return;
            }

            setLoadingMessage('جاري إنشاء الصوت...');
            const ttsResponse = await fetch('/api/tts-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: textToSpeak, voice: voice || 'Kore' }),
            });

            if (!ttsResponse.ok) {
                const errorBody = await ttsResponse.json();
                console.error("TTS Proxy Error:", errorBody);
                throw new Error(`TTS proxy request failed`);
            }

            const responseData = await ttsResponse.json();
            const audioContent = responseData.audioContent;
            
            if (audioContent && audioContextRef.current) {
                const audioBytes = decode(audioContent);
                const buffer = await decodeAudioData(audioBytes, audioContextRef.current, 24000, 1);
                setAudioBuffer(buffer);
                playAudio(0);
            } else {
                throw new Error("No audio content received.");
            }
        } catch (err) {
            console.error("Error in Text-to-Speech process:", err);
            setError(`حدث خطأ: ${err.message}`);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };
    
    // Function to convert AudioBuffer to MP3 Blob
    const createMp3Blob = (buffer: AudioBuffer): Blob => {
        const sampleRate = buffer.sampleRate;
        const numChannels = buffer.numberOfChannels;
        const pcmData = buffer.getChannelData(0); // Assuming mono audio

        const samples = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            samples[i] = pcmData[i] * 32767.5; // Convert float to 16-bit PCM
        }

        const mp3encoder = new lamejs.Mp3Encoder(numChannels, sampleRate, 128); // 128 kbps
        const mp3Data = [];
        const bufferSize = 1152; // Chunk size

        for (let i = 0; i < samples.length; i += bufferSize) {
            const sampleChunk = samples.subarray(i, i + bufferSize);
            const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
            if (mp3buf.length > 0) {
                mp3Data.push(new Int8Array(mp3buf));
            }
        }
        const mp3buf = mp3encoder.flush();
        if (mp3buf.length > 0) {
            mp3Data.push(new Int8Array(mp3buf));
        }

        return new Blob(mp3Data, { type: 'audio/mpeg' });
    };

    const handleDownload = () => {
        if (!audioBuffer) return;
        const mp3Blob = createMp3Blob(audioBuffer);
        const url = URL.createObjectURL(mp3Blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'generated_audio.mp3';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // UI Rendering
    return (
        <>
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">1</span>
                    <h3>أدخل المحتوى</h3>
                </div>
                <textarea
                    value={text}
                    onChange={(e) => {
                        setText(e.target.value);
                        if (image) setImage(null);
                    }}
                    placeholder="اكتب النص هنا أو ارفع صورة لقراءتها..."
                    rows={6}
                    aria-label="Text to be read aloud"
                    style={{color: 'black'}}
                ></textarea>

                {image && (
                     <div className="file-preview-area">
                        <div className="file-preview-item">
                            <img src={URL.createObjectURL(image)} alt="Preview" />
                             <button onClick={removeImage} aria-label={`إزالة الصورة`}>&times;</button>
                        </div>
                    </div>
                )}
                
                <div className="file-upload-area" style={{ marginTop: '1rem' }}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="file-upload-btn">
                        <span className="material-icons">add_photo_alternate</span>
                        <span>إرفاق صورة</span>
                    </button>
                </div>
            </div>

            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">2</span>
                    <h3>اختر الصوت</h3>
                </div>
                <div className="voice-selector" style={{margin: 0}}>
                    <button 
                        className={`voice-option ${voice === 'Kore' ? 'active' : ''}`}
                        onClick={() => setVoice('Kore')}
                        disabled={isLoading}
                        aria-pressed={voice === 'Kore'}
                    >
                        <span className="material-icons">female</span> صوت أنثوي
                    </button>
                    <button 
                        className={`voice-option ${voice === 'Puck' ? 'active' : ''}`}
                        onClick={() => setVoice('Puck')}
                        disabled={isLoading}
                        aria-pressed={voice === 'Puck'}
                    >
                        <span className="material-icons">male</span> صوت ذكوري
                    </button>
                </div>
            </div>
            
            <button onClick={handleListen} disabled={isLoading || (!text.trim() && !image)} className="generate-btn">
                <span className="material-icons">play_circle</span>
                {isLoading ? loadingMessage : 'استمع الآن'}
            </button>
            
            {isLoading && <div className="loader"></div>}
            {error && <p className="error-message">{error}</p>}
            
            {audioBuffer && !isLoading && (
                <div className="tts-results">
                    <div className="audio-player-container">
                        <div className="player-controls">
                            <button onClick={handlePlayPauseToggle} aria-label={isPlaying ? "Pause" : "Play"}>
                                <span className="material-icons">{isPlaying ? 'pause' : 'play_arrow'}</span>
                            </button>
                        </div>
                        <div className="progress-container">
                             <input
                                type="range"
                                className="progress-bar"
                                min="0"
                                max={audioBuffer.duration}
                                value={currentTime}
                                onChange={handleSeek}
                                style={{'--progress-percent': `${audioBuffer ? (currentTime / audioBuffer.duration) * 100 : 0}%`} as React.CSSProperties}
                                aria-label="Audio progress"
                            />
                            <div className="time-display">
                                {formatTime(currentTime)} / {formatTime(audioBuffer.duration)}
                            </div>
                        </div>
                    </div>
                    <div className="tts-download-container">
                         <button onClick={handleDownload} className="download-btn">
                            <span className="material-icons">download</span>
                            تحميل بصيغة MP3
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};


// --- Quiz Builder Page Component ---
const QuizBuilderPage = () => {
    const [topic, setTopic] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [questionType, setQuestionType] = useState('Multiple Choice');
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState('Medium');
    const [questions, setQuestions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showAnswers, setShowAnswers] = useState(false);
    const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResults, setEvaluationResults] = useState<{ [key: number]: { score: number; feedback: string } }>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files)]);
            event.target.value = null; // Allow re-selecting the same file
        }
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleGenerateQuestions = async () => {
        if (!topic.trim() && files.length === 0) return;
        setIsLoading(true);
        setQuestions([]);
        setError('');
        setShowAnswers(false);
        setUserAnswers({});
        setEvaluationResults({});

        try {
            const messageParts: any[] = [];
            
            const userInstruction = topic.trim() || `Generate questions based on the attached files.`;

            const promptText = `
                Based on the following topic/files and constraints, generate a set of exam questions.
                Your entire response MUST be a single JSON object with a single key "questions".
                The value for "questions" should be an array of question objects.

                Each question object must have the following properties:
                - "question": A string containing the question text.
                - "type": A string indicating the question type ("Multiple Choice", "True/False", or "Short Answer").
                - "answer": A string containing the correct answer. For True/False questions, the answer must be either "صح" or "خطأ".
                - "options": An array of strings for "Multiple Choice" questions. This property should only exist for multiple-choice questions. One of the options must be the correct answer.

                Please adhere strictly to this JSON format. Respond in Arabic.

                ---
                Topic/Instructions: "${userInstruction}"
                Question Type: "${questionType}"
                Number of Questions: ${numQuestions}
                Difficulty Level: "${difficulty}"
                ---
            `;
            
            messageParts.push({ text: promptText });

            for (const file of files) {
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    const base64Data = await fileToBase64(file);
                    messageParts.push({
                        inlineData: { mimeType: file.type, data: base64Data },
                    });
                }
            }

            const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ parts: messageParts }],
                config: {
                    responseMimeType: "application/json",
                },
            });

            const jsonStr = response.text.trim();
            const parsedJson = JSON.parse(jsonStr);
            setQuestions(parsedJson.questions || []);

            if (!parsedJson.questions || parsedJson.questions.length === 0) {
                setError('لم يتمكن النموذج من إنشاء أسئلة. حاول مرة أخرى بموضوع مختلف.');
            }
        } catch (err) {
            console.error("Error generating questions:", err);
            setError('عذراً، حدث خطأ أثناء إنشاء الأسئلة. يرجى التحقق من تنسيق استجابة النموذج.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectAnswer = (questionIndex: number, answer: string) => {
        if (showAnswers) return;
        setUserAnswers(prev => ({
            ...prev,
            [questionIndex]: answer,
        }));
    };

    const handleShowAnswers = async () => {
        setShowAnswers(true);
    
        const shortAnswerQuestionsToEvaluate = questions
            .map((q, index) => ({ ...q, index }))
            .filter(q => q.type === 'Short Answer' && userAnswers[q.index]?.trim());
    
        if (shortAnswerQuestionsToEvaluate.length === 0) {
            return;
        }
    
        setIsEvaluating(true);
        setEvaluationResults({});
    
        try {
            const evaluationPromises = shortAnswerQuestionsToEvaluate.map(q => {
                const prompt = `
                    You are an AI assistant evaluating a student's answer.
                    The question was: "${q.question}"
                    The model's correct answer is: "${q.answer}"
                    The student's answer is: "${userAnswers[q.index]}"
    
                    Please evaluate how correct the student's answer is compared to the model's answer.
                    Your response MUST be a single JSON object with two keys:
                    1. "score": an integer from 1 to 10, where 1 is completely wrong and 10 is perfectly correct.
                    2. "feedback": a short, one-sentence explanation in Arabic for the score you gave.
    
                    Adhere strictly to this JSON format.
                `;
                return callApi({
                    model: 'google/gemini-flash-1.5',
                    contents: [{ parts: [{ text: prompt }] }],
                    config: { responseMimeType: "application/json" },
                }).then(response => {
                    try {
                        const result = JSON.parse(response.text.trim());
                        return { index: q.index, ...result };
                    } catch (e) {
                        console.error("Failed to parse evaluation response for question index", q.index, response.text);
                        return { index: q.index, score: 0, feedback: "خطأ في تقييم الإجابة." };
                    }
                });
            });
    
            const results = await Promise.all(evaluationPromises);
    
            const newEvaluationResults = {};
            results.forEach(result => {
                newEvaluationResults[result.index] = { score: result.score, feedback: result.feedback };
            });
    
            setEvaluationResults(newEvaluationResults);
    
        } catch (err) {
            console.error("Error evaluating answers:", err);
            setError("حدث خطأ أثناء تقييم الإجابات.");
        } finally {
            setIsEvaluating(false);
        }
    };

    let score = 0;
    if (showAnswers && questions.length > 0) {
        questions.forEach((q, index) => {
            if (q.type !== 'Short Answer' && userAnswers[index] === q.answer) {
                score++;
            }
        });
    }

    const shortAnswerCount = questions.filter(q => q.type === 'Short Answer').length;
    const scoredQuestionCount = questions.length - shortAnswerCount;

    return (
        <>
            {/* Step 1: Provide Content */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">1</span>
                    <h3>أدخل المحتوى</h3>
                </div>
                <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="اكتب النص أو الموضوع هنا..."
                    rows={5}
                    aria-label="Topic for questions"
                    style={{color: 'black'}}
                ></textarea>
                
                <div className="file-upload-area">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        multiple
                        aria-hidden="true"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="file-upload-btn">
                        <span className="material-icons">upload_file</span>
                        <span>إرفاق ملف (صورة أو PDF)</span>
                    </button>
                </div>

                {files.length > 0 && (
                    <div className="file-preview-area">
                        {files.map((file, index) => (
                            <div key={index} className={`file-preview-item ${file.type === 'application/pdf' ? 'pdf-preview' : ''}`}>
                                {file.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(file)} alt={file.name} />
                                ) : (
                                    <>
                                        <span className="material-icons">picture_as_pdf</span>
                                        <span className="file-name">{file.name}</span>
                                    </>
                                )}
                                <button onClick={() => removeFile(index)} aria-label={`إزالة ${file.name}`}>&times;</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            {/* Step 2: Customize Quiz */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">2</span>
                    <h3>خصص الإعدادات</h3>
                </div>
                <div className="quiz-settings-grid">
                    {/* Question Type */}
                    <div className="setting-group">
                        <label><span className="material-icons">list_alt</span> نوع الأسئلة</label>
                        <div className="segmented-control">
                            <button className={questionType === 'Multiple Choice' ? 'active' : ''} onClick={() => setQuestionType('Multiple Choice')}>اختيار من متعدد</button>
                            <button className={questionType === 'True/False' ? 'active' : ''} onClick={() => setQuestionType('True/False')}>صح / خطأ</button>
                            <button className={questionType === 'Short Answer' ? 'active' : ''} onClick={() => setQuestionType('Short Answer')}>إجابة قصيرة</button>
                        </div>
                    </div>
                    {/* Difficulty */}
                    <div className="setting-group">
                        <label><span className="material-icons">signal_cellular_alt</span> مستوى الصعوبة</label>
                         <div className="segmented-control">
                            <button className={difficulty === 'Easy' ? 'active' : ''} onClick={() => setDifficulty('Easy')}>سهل</button>
                            <button className={difficulty === 'Medium' ? 'active' : ''} onClick={() => setDifficulty('Medium')}>متوسط</button>
                            <button className={difficulty === 'Hard' ? 'active' : ''} onClick={() => setDifficulty('Hard')}>صعب</button>
                        </div>
                    </div>
                    {/* Number of Questions */}
                    <div className="setting-group">
                         <label htmlFor="num-questions"><span className="material-icons">tag</span> عدد الأسئلة</label>
                        <input
                            id="num-questions"
                            type="number"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10)))}
                            min="1"
                            max="20"
                        />
                    </div>
                </div>
            </div>

            {/* Step 3: Generate */}
            <button onClick={handleGenerateQuestions} disabled={isLoading || (!topic.trim() && files.length === 0)} className="generate-btn">
                <span className="material-icons">auto_awesome</span>
                {isLoading ? 'جاري الإنشاء...' : 'إنشاء الأسئلة'}
            </button>
            
            {isLoading && <div className="loader"></div>}
            
            {error && <p className="error-message">{error}</p>}

            {questions.length > 0 && (
                <div className={`questions-container ${showAnswers ? 'answers-shown' : ''}`}>
                    <h2>الأسئلة التي تم إنشاؤها</h2>

                    {showAnswers && scoredQuestionCount > 0 && (
                        <div className="quiz-score-container">
                            <h3>النتيجة: {score} / {scoredQuestionCount}</h3>
                        </div>
                    )}

                    {questions.map((q, index) => (
                        <div key={index} className="question-card">
                            <p className="question-text"><strong>{index + 1}. </strong>{q.question}</p>
                            
                            {q.type === 'Multiple Choice' && q.options && (
                                <ul className="options-list">
                                    {q.options.map((option, i) => {
                                        const isSelected = userAnswers[index] === option;
                                        const isCorrect = q.answer === option;
                                        let className = '';
                                        if (showAnswers) {
                                            if (isCorrect) className = 'correct';
                                            else if (isSelected && !isCorrect) className = 'incorrect';
                                        } else if (isSelected) className = 'selected';
                                        return ( <li key={i} className={className} onClick={() => !showAnswers && handleSelectAnswer(index, option)} > {option} </li> );
                                    })}
                                </ul>
                            )}

                            {q.type === 'True/False' && (
                                <div className="true-false-options">
                                    {['صح', 'خطأ'].map((option, i) => {
                                        const isSelected = userAnswers[index] === option;
                                        const isCorrect = q.answer === option;
                                        let className = 'tf-option-btn';
                                        if (showAnswers) {
                                            if (isCorrect) className += ' correct';
                                            else if (isSelected && !isCorrect) className += ' incorrect';
                                        } else if (isSelected) className += ' selected';
                                        return ( <button key={i} className={className} onClick={() => handleSelectAnswer(index, option)} disabled={showAnswers} > {option === 'صح' ? ( <><span className="material-icons">check_circle</span> صح</> ) : ( <><span className="material-icons">cancel</span> خطأ</> )} </button> );
                                    })}
                                </div>
                            )}

                            {q.type === 'Short Answer' && (
                                <div className="short-answer-container">
                                    <textarea
                                        className="short-answer-input"
                                        placeholder={showAnswers && !userAnswers[index] ? "لم تقدم إجابة" : "اكتب إجابتك هنا..."}
                                        value={userAnswers[index] || ''}
                                        onChange={(e) => handleSelectAnswer(index, e.target.value)}
                                        readOnly={showAnswers}
                                        rows={3}
                                    ></textarea>
                                    {showAnswers && (
                                        <div className="short-answer-feedback">
                                            {(isEvaluating && evaluationResults[index] === undefined && userAnswers[index]?.trim()) ? (
                                                <div className="evaluating-notice">
                                                    <div className="loader small"></div>
                                                    <span>جاري تقييم إجابتك...</span>
                                                </div>
                                            ) : evaluationResults[index] ? (
                                                <div className="evaluation-result">
                                                    <div className="score-display">
                                                        <span className="score-label">التقييم:</span>
                                                        <div className="score-bar-container">
                                                            <div className="score-bar" style={{ width: `${evaluationResults[index].score * 10}%` }}></div>
                                                        </div>
                                                        <span className="score-text">{evaluationResults[index].score} / 10</span>
                                                    </div>
                                                    <p className="feedback-text">
                                                        <span className="material-icons">comment</span>
                                                        {evaluationResults[index].feedback}
                                                    </p>
                                                </div>
                                            ) : null}
                                            <div className="answer-text">
                                                <strong>الإجابة النموذجية:</strong> {q.answer}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                    {!showAnswers && (
                        <button onClick={handleShowAnswers} className="reveal-answers-btn">
                             <span className="material-icons">visibility</span>
                            إظهار الحل
                        </button>
                    )}
                </div>
            )}
        </>
    );
};


// --- IQ Test Page Component ---
const IQTestPage = () => {
    const [testStarted, setTestStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [testFinished, setTestFinished] = useState(false);
    const [difficulty, setDifficulty] = useState('medium');
    const [numQuestions, setNumQuestions] = useState(5);
    const [subject, setSubject] = useState('general');
    const [timeLeft, setTimeLeft] = useState(60);
    const [currentTestQuestions, setCurrentTestQuestions] = useState<any[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const timeoutRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        // Clear timers if the component unmounts
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const getTimerDuration = () => {
        switch (difficulty) {
            case 'easy': return 45;
            case 'medium': return 60;
            case 'hard': return 90;
            default: return 60;
        }
    };

    useEffect(() => {
        if (isAnswered || !testStarted || testFinished) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }

        setTimeLeft(getTimerDuration()); // Reset timer for the new question

        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    handleAnswerClick(null); // Time's up
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [currentQuestionIndex, testStarted, testFinished, isAnswered]);

    const handleStartTest = async () => {
        setIsLoading(true);
        setError('');

        const difficultyMap = {
            easy: 'سهل',
            medium: 'متوسط',
            hard: 'صعب'
        };
        
        const subjectMap = {
            general: 'عام ومتنوع',
            logic: 'المنطق والتفكير النقدي',
            math: 'الرياضيات والأنماط العددية',
            spatial: 'التفكير المكاني والبصري'
        };

        const promptText = `
            قم بإنشاء ${numQuestions} سؤالاً لاختبار الذكاء (IQ) في موضوع "${subjectMap[subject]}" وبمستوى صعوبة "${difficultyMap[difficulty]}".
            يجب أن تكون إجابتك بأكملها عبارة عن كائن JSON واحد بمفتاح واحد هو "questions".
            يجب أن تكون قيمة "questions" عبارة عن مصفوفة من كائنات الأسئلة.

            يجب أن يحتوي كل كائن سؤال على الخصائص التالية:
            - "question": سلسلة نصية تحتوي على نص السؤال.
            - "options": مصفوفة تحتوي على 4 سلاسل نصية بالضبط تمثل خيارات الاختيار من متعدد.
            - "correctAnswer": سلسلة نصية تحتوي على الإجابة الصحيحة، والتي يجب أن تكون إحدى السلاسل النصية من مصفوفة "options".

            يرجى الالتزام الصارم بتنسيق JSON هذا. يجب أن تكون جميع النصوص باللغة العربية.
        `;

        try {
            const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ parts: [{ text: promptText }] }],
                config: {
                    responseMimeType: "application/json",
                },
            });

            const jsonStr = response.text.trim();
            const parsedJson = JSON.parse(jsonStr);

            if (parsedJson.questions && parsedJson.questions.length > 0) {
                setCurrentTestQuestions(parsedJson.questions);
                setTestStarted(true);
                setTestFinished(false);
                setCurrentQuestionIndex(0);
                setScore(0);
                setIsAnswered(false);
                setSelectedAnswer(null);
            } else {
                throw new Error("Generated questions are invalid or empty.");
            }
        } catch (err) {
            console.error("Error generating IQ questions:", err);
            setError('عذراً، حدث خطأ أثناء إنشاء الأسئلة. الرجاء المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAnswerClick = (selectedOption: string | null) => {
        if (isAnswered) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        setIsAnswered(true);
        setSelectedAnswer(selectedOption);

        if (selectedOption !== null && selectedOption === currentTestQuestions[currentQuestionIndex].correctAnswer) {
            setScore(prevScore => prevScore + 1);
        }

        timeoutRef.current = window.setTimeout(() => {
            const nextQuestionIndex = currentQuestionIndex + 1;
            if (nextQuestionIndex < currentTestQuestions.length) {
                setCurrentQuestionIndex(nextQuestionIndex);
                setIsAnswered(false);
                setSelectedAnswer(null);
            } else {
                setTestFinished(true);
            }
        }, 1200);
    };
    
    const getScoreMessage = () => {
        const percentage = (score / currentTestQuestions.length) * 100;
        if (percentage >= 90) {
            return "مذهل! نتيجتك تشير إلى مستوى عالٍ جدًا من الذكاء والقدرة على التحليل العميق. أنت تمتلك عقلاً استثنائياً.";
        } else if (percentage >= 70) {
            return "أداء رائع! أنت أذكى من المتوسط ولديك مهارات تفكير منطقي قوية. استمر في تحدي عقلك.";
        } else if (percentage >= 50) {
            return "نتيجة جيدة! أنت تمتلك مستوى جيد من الذكاء. الممارسة المستمرة ستصقل مهاراتك أكثر.";
        } else if (percentage >= 30) {
            return "لا بأس بها. كل رحلة تبدأ بخطوة. حاول مرة أخرى وركز على فهم نمط الأسئلة.";
        } else {
            return "هذه مجرد بداية. لا تدع هذه النتيجة تحبطك. التدريب والممارسة يصنعان الفارق!";
        }
    };

    if (!testStarted) {
        return (
            <div className="iq-setup-page">
                <div className="quiz-step-card">
                    <div className="quiz-step-header">
                        <span className="step-number">1</span>
                        <h3>اختر الإعدادات</h3>
                    </div>
                    <div className="quiz-settings-grid">
                        {/* Subject */}
                        <div className="setting-group">
                            <label><span className="material-icons">category</span> الموضوع</label>
                            <div className="segmented-control">
                                <button className={subject === 'general' ? 'active' : ''} onClick={() => setSubject('general')}>عام</button>
                                <button className={subject === 'logic' ? 'active' : ''} onClick={() => setSubject('logic')}>المنطق</button>
                                <button className={subject === 'math' ? 'active' : ''} onClick={() => setSubject('math')}>الرياضيات</button>
                                <button className={subject === 'spatial' ? 'active' : ''} onClick={() => setSubject('spatial')}>مكاني</button>
                            </div>
                        </div>
                        {/* Difficulty */}
                        <div className="setting-group">
                            <label><span className="material-icons">signal_cellular_alt</span> مستوى الصعوبة</label>
                            <div className="segmented-control">
                                <button className={difficulty === 'easy' ? 'active' : ''} onClick={() => setDifficulty('easy')}>سهل</button>
                                <button className={difficulty === 'medium' ? 'active' : ''} onClick={() => setDifficulty('medium')}>متوسط</button>
                                <button className={difficulty === 'hard' ? 'active' : ''} onClick={() => setDifficulty('hard')}>صعب</button>
                            </div>
                        </div>
                        {/* Number of Questions */}
                        <div className="setting-group">
                            <label><span className="material-icons">tag</span> عدد الأسئلة</label>
                            <div className="segmented-control">
                                <button className={numQuestions === 5 ? 'active' : ''} onClick={() => setNumQuestions(5)}>5</button>
                                <button className={numQuestions === 10 ? 'active' : ''} onClick={() => setNumQuestions(10)}>10</button>
                                <button className={numQuestions === 15 ? 'active' : ''} onClick={() => setNumQuestions(15)}>15</button>
                            </div>
                        </div>
                    </div>
                </div>
    
                <button onClick={handleStartTest} className="generate-btn" disabled={isLoading}>
                    <span className="material-icons">psychology</span>
                    {isLoading ? 'جاري إنشاء الأسئلة...' : 'ابدأ الاختبار'}
                </button>
    
                {isLoading && <div className="loader"></div>}
                {error && <p className="error-message">{error}</p>}
            </div>
        );
    }

    if (testFinished) {
        return (
            <div className="iq-results-card">
                <h1>انتهى الاختبار!</h1>
                <p className="iq-score-text">نتيجتك هي: <strong>{score}</strong> من <strong>{currentTestQuestions.length}</strong></p>
                <p className="iq-feedback-text">{getScoreMessage()}</p>
                <button onClick={() => setTestStarted(false)} className="iq-restart-btn">
                    <span className="material-icons">refresh</span>
                    العودة للقائمة
                </button>
            </div>
        );
    }

    const currentQuestion = currentTestQuestions[currentQuestionIndex];
    const progressPercentage = ((currentQuestionIndex) / currentTestQuestions.length) * 100;

    return (
        <div className="iq-test-content">
             <div className="iq-progress-bar-container">
                <div className="iq-progress-bar" style={{ width: `${progressPercentage}%` }}></div>
            </div>
            <div className="iq-question-container">
                 <div className="iq-question-header">
                    <p className="iq-question-counter">السؤال {currentQuestionIndex + 1} / {currentTestQuestions.length}</p>
                    <div className="iq-timer">
                        <span className="material-icons">timer</span>
                        <span>{timeLeft} ث</span>
                    </div>
                </div>
                <div className="iq-timer-progress-wrapper">
                    <div className="iq-timer-progress" style={{width: `${(timeLeft / getTimerDuration()) * 100}%`}}></div>
                </div>
                <h2 className="iq-question-text">{currentQuestion.question}</h2>
                <div className="iq-options-list">
                    {currentQuestion.options.map((option, index) => {
                        let buttonClass = 'iq-option-btn';
                        if (isAnswered) {
                            if (option === currentQuestion.correctAnswer) {
                                buttonClass += ' correct';
                            } else if (option === selectedAnswer) {
                                buttonClass += ' incorrect';
                            }
                        }
                        return (
                            <button 
                                key={index} 
                                onClick={() => handleAnswerClick(option)} 
                                className={buttonClass}
                                disabled={isAnswered}
                            >
                                {option}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// --- Mind Map Page Component ---
const MindMapPage = () => {
    const [topic, setTopic] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [mindMap, setMindMap] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prevFiles => [...prevFiles, ...Array.from(event.target.files)]);
            event.target.value = null;
        }
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    };

    const handleGenerateMindMap = async () => {
        if (!topic.trim() && files.length === 0) return;
        setIsLoading(true);
        setMindMap(null);
        setError('');

        try {
            const messageParts: any[] = [];
            
            const userInstruction = topic.trim() || `Generate a mind map based on the attached files.`;

            const promptText = `
                Based on the following topic and/or files, generate a mind map.
                Your response should be ONLY the mind map, formatted as a hierarchical Markdown list.
                - Use hyphens (-) for each level.
                - Nest sub-topics using indentation.
                - Do not include any introductory or concluding text, just the Markdown list.
                - The response must be in Arabic.

                ---
                Topic/Instructions: "${userInstruction}"
                ---
            `;
            
            messageParts.push({ text: promptText });

            for (const file of files) {
                if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                    const base64Data = await fileToBase64(file);
                    messageParts.push({
                        inlineData: { mimeType: file.type, data: base64Data },
                    });
                }
            }
            
            const response = await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ role: 'user', parts: messageParts }],
            });
            
            if (response.text) {
                setMindMap(response.text);
            } else {
                setError('لم يتمكن النموذج من إنشاء خريطة ذهنية. حاول مرة أخرى بموضوع مختلف.');
            }

        } catch (err) {
            console.error("Error generating mind map:", err);
            setError('عذراً، حدث خطأ أثناء إنشاء الخريطة الذهنية.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="step-number">1</span>
                    <h3>أدخل الموضوع الرئيسي</h3>
                </div>
                <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="اكتب الموضوع أو الفكرة الرئيسية هنا..."
                    rows={5}
                    aria-label="Topic for mind map"
                    style={{color: 'black'}}
                ></textarea>
                
                <div className="file-upload-area">
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                        style={{ display: 'none' }}
                        multiple
                        aria-hidden="true"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="file-upload-btn">
                        <span className="material-icons">upload_file</span>
                        <span>أو ارفق ملف (صورة أو PDF)</span>
                    </button>
                </div>

                {files.length > 0 && (
                    <div className="file-preview-area">
                        {files.map((file, index) => (
                            <div key={index} className={`file-preview-item ${file.type === 'application/pdf' ? 'pdf-preview' : ''}`}>
                                {file.type.startsWith('image/') ? (
                                    <img src={URL.createObjectURL(file)} alt={file.name} />
                                ) : (
                                    <>
                                        <span className="material-icons">picture_as_pdf</span>
                                        <span className="file-name">{file.name}</span>
                                    </>
                                )}
                                <button onClick={() => removeFile(index)} aria-label={`إزالة ${file.name}`}>&times;</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <button onClick={handleGenerateMindMap} disabled={isLoading || (!topic.trim() && files.length === 0)} className="generate-btn">
                <span className="material-icons">share</span>
                {isLoading ? 'جاري الإنشاء...' : 'أنشئ الخريطة'}
            </button>
            
            {isLoading && <div className="loader"></div>}
            
            {error && <p className="error-message">{error}</p>}

            {mindMap && (
                <div className="result-section" style={{marginTop: '1.5rem'}}>
                    <h2>الخريطة الذهنية</h2>
                    <MarkdownRenderer text={mindMap} />
                </div>
            )}
        </>
    );
};


// --- Tools Page (Hub) Component ---
const ToolsPage = () => {
    const [activeTool, setActiveTool] = useState<string | null>(null);

    const tools = [
        { id: 'summarizer', name: 'أداة التلخيص', icon: 'mediation', description: 'لخص النصوص، الكتب، أو حتى الصور بذكاء' },
        { id: 'reader', name: 'القارئ الصوتي', icon: 'volume_up', description: 'حول النص أو الصور إلى كلام مسموع' },
        { id: 'quiz', name: 'صانع الاختبارات', icon: 'quiz', description: 'أنشئ أسئلة امتحانية من أي نص أو ملف' },
        { id: 'mindmap', name: 'صانع الخرائط الذهنية', icon: 'share', description: 'حوّل الأفكار المعقدة إلى خريطة ذهنية سهلة الفهم' },
        { id: 'iq', name: 'اختبار الذكاء', icon: 'psychology', description: 'اختبر مهاراتك في التفكير المنطقي' }
    ];

    const renderActiveTool = () => {
        switch (activeTool) {
            case 'summarizer':
                return <SummarizerPage />;
            case 'reader':
                return <TextToSpeechPage />;
            case 'quiz':
                return <QuizBuilderPage />;
            case 'mindmap':
                return <MindMapPage />;
            case 'iq':
                return <IQTestPage />;
            default:
                return null;
        }
    };
    
    const activeToolData = tools.find(t => t.id === activeTool);

    if (activeTool && activeToolData) {
        // Render the active tool with a back button
        return (
            <div className="page tools-page active-tool">
                <div className="header">
                    <button onClick={() => setActiveTool(null)} className="back-button" aria-label="العودة">
                        <span className="material-icons">arrow_forward</span>
                    </button>
                    <h1>{activeToolData.name}</h1>
                    <p>{activeToolData.description}</p>
                </div>
                {renderActiveTool()}
            </div>
        );
    }

    // Render the tool selection grid
    return (
        <div className="page tools-page">
            <div className="header">
                <h1>صندوق الأدوات</h1>
                <p>اختر الأداة التي تناسب احتياجك</p>
            </div>
            <div className="vpn-note">
                <span className="material-icons">info_outline</span>
                <p>ملاحظة: إذا واجهت مشكلة في عمل الأدوات، قد يساعد استخدام VPN في حلها.</p>
            </div>
            <div className="selection-grid">
                {tools.map(tool => (
                    <div key={tool.id} className="selection-card" onClick={() => setActiveTool(tool.id)}>
                        <span className="material-icons selection-icon">{tool.icon}</span>
                        <h3>{tool.name}</h3>
                        <p className="tool-description">{tool.description}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Settings Page Component ---
const SettingsPage = ({ onBack }) => {
    const [themeColor, setThemeColor] = useState(localStorage.getItem('themeColor') || '#B89F71');
    const [themeMode, setThemeMode] = useState(localStorage.getItem('themeMode') || 'auto');
    const [background, setBackground] = useState(localStorage.getItem('themeBackground') || 'default');

    const handleColorChange = (color: string) => {
        localStorage.setItem('themeColor', color);
        setThemeColor(color);
        const darkColor = shadeColor(color, -20);
        document.documentElement.style.setProperty('--primary-color', color);
        document.documentElement.style.setProperty('--primary-dark', darkColor);
    };

    const handleModeChange = (mode: string) => {
        localStorage.setItem('themeMode', mode);
        setThemeMode(mode);
        if (mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    };

    const handleBackgroundChange = (bgUrl: string) => {
        localStorage.setItem('themeBackground', bgUrl);
        setBackground(bgUrl);
        if (bgUrl === 'default') {
            document.documentElement.style.removeProperty('--background-image');
            document.documentElement.style.removeProperty('--background-size');
            document.documentElement.style.removeProperty('--background-repeat');
        } else {
            document.documentElement.style.setProperty('--background-image', `url(${bgUrl})`);
            document.documentElement.style.setProperty('--background-size', 'auto');
            document.documentElement.style.setProperty('--background-repeat', 'repeat');
        }
    };
    
    const themeColors = [
        { name: 'ذهبي', value: '#B89F71' },
        { name: 'أزرق', value: '#4A90E2' },
        { name: 'أخضر', value: '#50E3C2' },
        { name: 'أحمر', value: '#D0021B' },
        { name: 'بنفسجي', value: '#9013FE' },
        { name: 'برتقالي', value: '#F5A623' },
        { name: 'وردي', value: '#E91E63' },
        { name: 'تركواز', value: '#009688' },
        { name: 'رمادي', value: '#607D8B' },
    ];

    const backgrounds = [
        { id: 'default', name: 'افتراضي', url: 'default' },
        { id: 'paper', name: 'ورق فاخر', url: 'https://www.transparenttextures.com/patterns/clean-gray-paper.png' },
        { id: 'waves', name: 'أمواج هادئة', url: 'https://www.transparenttextures.com/patterns/wavecut.png' },
        { id: 'lines', name: 'خطوط ناعمة', url: 'https://www.transparenttextures.com/patterns/simple-dashed.png' },
        { id: 'carbon', name: 'ألياف الكربون', url: 'https://www.transparenttextures.com/patterns/carbon-fibre-v2.png' },
        { id: 'hex', name: 'سداسي أنيق', url: 'https://www.transparenttextures.com/patterns/hexellence.png' },
        { id: 'pinstripe', name: 'تخطيط دقيق', url: 'https://www.transparenttextures.com/patterns/pinstripe-light.png' },
        { id: 'rice', name: 'ورق الأرز', url: 'https://www.transparenttextures.com/patterns/rice-paper-2.png' },
        { id: 'wall', name: 'جدار أبيض', url: 'https://www.transparenttextures.com/patterns/white-wall-3.png' },
        { id: 'stardust', name: 'غبار النجوم', url: 'https://www.transparenttextures.com/patterns/stardust.png' },
        { id: 'scratch', name: 'نسيج متقاطع', url: 'https://www.transparenttextures.com/patterns/cross-scratches.png' },
    ];
    
    return (
        <div className="page settings-page">
            <div className="header">
                <button onClick={onBack} className="back-button" aria-label="العودة">
                    <span className="material-icons">arrow_forward</span>
                </button>
                <h1>الإعدادات</h1>
            </div>

            {/* Theme Color Section */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons">palette</span>
                    <h3>لون التطبيق</h3>
                </div>
                <div className="color-swatches">
                    {themeColors.map(color => (
                        <button 
                            key={color.value} 
                            className={`color-swatch ${themeColor === color.value ? 'active' : ''}`}
                            style={{ backgroundColor: color.value }}
                            onClick={() => handleColorChange(color.value)}
                            aria-label={`تغيير اللون إلى ${color.name}`}
                        />
                    ))}
                </div>
            </div>

            {/* Theme Mode Section */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons">brightness_6</span>
                    <h3>وضع المظهر</h3>
                </div>
                 <div className="segmented-control">
                    <button type="button" className={themeMode === 'light' ? 'active' : ''} onClick={() => handleModeChange('light')}>نهاري</button>
                    <button type="button" className={themeMode === 'dark' ? 'active' : ''} onClick={() => handleModeChange('dark')}>ليلي</button>
                    <button type="button" className={themeMode === 'auto' ? 'active' : ''} onClick={() => handleModeChange('auto')}>تلقائي</button>
                </div>
            </div>

             {/* Background Section */}
             <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons">wallpaper</span>
                    <h3>خلفية التطبيق</h3>
                </div>
                <div className="background-swatches">
                    {backgrounds.map(bg => (
                        <button
                            key={bg.id}
                            className={`background-swatch ${background === bg.url ? 'active' : ''}`}
                            style={bg.url !== 'default' ? { backgroundImage: `url(${bg.url})` } : {}}
                            onClick={() => handleBackgroundChange(bg.url)}
                            aria-label={`تغيير الخلفية إلى ${bg.name}`}
                        >
                            {bg.url === 'default' && <span className="material-icons">format_color_fill</span>}
                        </button>
                    ))}
                </div>
            </div>

            {/* The BIG new feature update */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons" style={{color: '#E4A11B'}}>auto_awesome</span>
                    <h3>التحديث القادم بعون الله</h3>
                </div>
                <p className="about-us-text">
                    نعمل على ميزة ثورية: تخصيص الذكاء الاصطناعي لكل كتاب. ستتمكن من سؤال النموذج عن أي شيء في كتابك وسيجيبك بدقة من محتواه. نخطط أيضًا لأدوات أخرى تساعد في الدراسة. يمكنك دائمًا اقتراح أدوات جديدة لتحسين التطبيق عبر صفحة الاقتراحات.
                </p>
            </div>

            {/* General Upcoming Updates Section */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons">upcoming</span>
                    <h3>تحديثات قادمة أخرى</h3>
                </div>
                <ul className="info-list">
                    <li>إضافة دورات تعليمية مسجلة للمواد الأساسية.</li>
                    <li>توفير قسم خاص للملخصات والنماذج الامتحانية.</li>
                    <li>إنشاء غرف دردشة جماعية لكل مادة دراسية.</li>
                    <li>تحسينات مستمرة بناءً على اقتراحاتكم القيمة.</li>
                </ul>
            </div>

            {/* Follow Us Section */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons">group_add</span>
                    <h3>تابعنا على</h3>
                </div>
                <div className="social-links-container">
                    <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="social-link facebook">
                        فيسبوك
                    </a>
                    <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="social-link instagram">
                        انستغرام
                    </a>
                    <a href="https://whatsapp.com" target="_blank" rel="noopener noreferrer" className="social-link whatsapp">
                        قناة الواتساب
                    </a>
                </div>
            </div>

            {/* About Us Section */}
            <div className="quiz-step-card">
                <div className="quiz-step-header">
                    <span className="material-icons">info</span>
                    <h3>من نحن</h3>
                </div>
                <p className="about-us-text">
                    نحن فريق من المطورين والمعلمين السوريين، نسعى لتقديم أدوات تعليمية حديثة ومبتكرة لمساعدة طلابنا على التفوق الدراسي. هذا التطبيق هو خطوتنا الأولى نحو تحقيق هذا الهدف.
                </p>
            </div>
        </div>
    );
};


// --- Suggestions Page Component ---
const SuggestionsPage = () => {
    const [showSettings, setShowSettings] = useState(false);
    const [suggestionType, setSuggestionType] = useState('تحسين');
    const [suggestionText, setSuggestionText] = useState('');
    const [suggesterName, setSuggesterName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!suggestionText.trim()) {
            setError('يرجى كتابة اقتراحك قبل الإرسال.');
            return;
        }
        
        setIsLoading(true);
        setError('');

        try {
            // This now uses the callApi helper, which goes through the secure proxy
            const prompt = `
                New suggestion received from the app.
                Source: 'SuggestionsPage'
                Type: ${suggestionType}
                Suggestion: ${suggestionText}
                Name: ${suggesterName || 'Anonymous'}
            `;
            await callApi({
                model: 'google/gemini-flash-1.5',
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
            });

            setIsSubmitted(true);
            setSuggestionText('');
            setSuggesterName('');
            
        } catch (err) {
            setError((err as Error).message || 'حدث خطأ غير متوقع.');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (showSettings) {
        return <SettingsPage onBack={() => setShowSettings(false)} />;
    }

    if (isSubmitted) {
        return (
            <div className="page suggestions-page">
                <div className="header">
                    <h1>الاقتراحات والتحسينات</h1>
                </div>
                <div className="suggestion-success-message">
                    <span className="material-icons">check_circle</span>
                    <h3>شكراً لك!</h3>
                    <p>تم استلام اقتراحك بنجاح. نحن نقدر مساهمتك في تطوير التطبيق.</p>
                    <button onClick={() => setIsSubmitted(false)} className="generate-btn" style={{width: "auto", padding: "0.75rem 1.5rem"}}>
                        إرسال اقتراح آخر
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page suggestions-page">
            <div className="header suggestions-header">
                <div className="header-content">
                    <h1>الاقتراحات والتحسينات</h1>
                    <p>نحن نقدر رأيك! ساهم في تطوير التطبيق باقتراحاتك.</p>
                </div>
                <button onClick={() => setShowSettings(true)} className="settings-button" aria-label="الإعدادات">
                    <span className="material-icons">settings</span>
                </button>
            </div>
            <form onSubmit={handleSubmit} className="suggestion-form">
                <div className="quiz-step-card">
                    <div className="quiz-step-header">
                        <span className="step-number">1</span>
                        <h3>اختر نوع الاقتراح</h3>
                    </div>
                    <div className="setting-group">
                         <div className="segmented-control">
                            <button type="button" className={suggestionType === 'تحسين' ? 'active' : ''} onClick={() => setSuggestionType('تحسين')}>تحسين</button>
                            <button type="button" className={suggestionType === 'أداة جديدة' ? 'active' : ''} onClick={() => setSuggestionType('أداة جديدة')}>أداة جديدة</button>
                            <button type="button" className={suggestionType === 'إبلاغ عن خطأ' ? 'active' : ''} onClick={() => setSuggestionType('إبلاغ عن خطأ')}>إبلاغ عن خطأ</button>
                        </div>
                    </div>
                </div>
                <div className="quiz-step-card">
                     <div className="quiz-step-header">
                        <span className="step-number">2</span>
                        <h3>اكتب التفاصيل</h3>
                    </div>
                     <textarea
                        value={suggestionText}
                        onChange={(e) => setSuggestionText(e.target.value)}
                        placeholder="اكتب اقتراحك هنا بالتفصيل..."
                        rows={7}
                        required
                        aria-label="Suggestion details"
                    ></textarea>
                </div>
                 <div className="quiz-step-card">
                     <div className="quiz-step-header">
                        <span className="step-number">3</span>
                        <h3>الاسم (اختياري)</h3>
                    </div>
                     <input
                        type="text"
                        value={suggesterName}
                        onChange={(e) => setSuggesterName(e.target.value)}
                        placeholder="اكتب اسمك هنا..."
                        aria-label="اسم المقترح"
                        style={{backgroundColor: 'var(--background-color)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem', width: '100%'}}
                    />
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit" disabled={isLoading} className="generate-btn">
                    {isLoading ? (
                        <div className="loader small" style={{borderColor: 'white', borderTopColor: 'transparent'}}></div>
                    ) : (
                       <> <span className="material-icons">send</span> إرسال الاقتراح </>
                    )}
                </button>
            </form>
        </div>
    );
};


// --- Render App ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
