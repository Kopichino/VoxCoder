document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize CodeMirror
    const editor = CodeMirror(document.getElementById("editor-container"), {
        mode: "python",
        theme: "dracula",
        lineNumbers: true,
        lineWrapping: true, /* Enable line wrapping */
        autoCloseBrackets: true,
        bgClass: "cm-custom-bg"
    });

    // 2. Load Initial Code
    fetch("/api/code")
        .then(res => res.json())
        .then(data => {
            if (data.code) {
                editor.setValue(data.code);
            }
        });

    // 3. Theme Toggle
    const themeBtn = document.getElementById("theme-toggle");
    const body = document.body;
    let isDark = true;

    themeBtn.addEventListener("click", () => {
        isDark = !isDark;
        if (isDark) {
            body.classList.remove("light-mode");
            body.classList.add("dark-mode");
            editor.setOption("theme", "dracula");
            themeBtn.innerText = "🌙";
        } else {
            body.classList.remove("dark-mode");
            body.classList.add("light-mode");
            editor.setOption("theme", "eclipse");
            themeBtn.innerText = "☀️";
        }
    });

    // 4. Manual Edit Sync (Debounced Save)
    let saveTimeout;
    const statusIndicator = document.getElementById("status-indicator");

    editor.on("change", () => {
        statusIndicator.innerText = "Unsaved...";
        statusIndicator.style.opacity = "0.7";
        
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const code = editor.getValue();
            fetch("/api/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: code })
            })
            .then(res => res.json())
            .then(data => {
                if(data.status === "saved") {
                    statusIndicator.innerText = "Saved";
                    statusIndicator.style.opacity = "1";
                }
            });
        }, 1000); // Auto-save after 1 second of inactivity
    });


    // 5. Voice Recording logic
    const recordBtn = document.getElementById("record-btn");
    const instructionDisplay = document.getElementById("instruction-display");
    const logList = document.getElementById("log-list");
    
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    recordBtn.addEventListener("click", async () => {
        if (!isRecording) {
            // Start Recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                
                mediaRecorder.start();
                isRecording = true;
                recordBtn.classList.add("recording");
                instructionDisplay.innerText = "Listening...";
                audioChunks = [];

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                    sendAudioToServer(audioBlob);
                });

            } catch (err) {
                alert("Error accessing microphone: " + err);
            }
        } else {
            // Stop Recording
            mediaRecorder.stop();
            isRecording = false;
            recordBtn.classList.remove("recording");
            instructionDisplay.innerText = "Processing...";
        }
    });

    async function sendAudioToServer(audioBlob) {
        const formData = new FormData();
        formData.append("audio", audioBlob);
        
        // Also send current code context
        const currentCode = editor.getValue();
        formData.append("currentCode", currentCode);

        try {
            const response = await fetch("/api/process_voice", {
                method: "POST",
                body: formData
            });
            
            const data = await response.json();
            
            if (data.status === "success") {
                instructionDisplay.innerText = "Done!";
                editor.setValue(data.code);
                
                // Add to log
                const li = document.createElement("li");
                li.innerText = `🗣️ "${data.transcription}"`;
                logList.insertBefore(li, logList.firstChild);
                
                setTimeout(() => {
                    instructionDisplay.innerText = "Press the mic pattern to speak...";
                }, 2000);
            } else {
                instructionDisplay.innerText = "Error processing command.";
            }
        } catch (error) {
            console.error("Error:", error);
            instructionDisplay.innerText = "Error communicating with server.";
        }
    }

    // 6. Run Code Logic
    const runBtn = document.getElementById("run-btn");
    const terminalOutput = document.getElementById("terminal-output");
    const clearTermBtn = document.getElementById("clear-term");
    const stdinInput = document.getElementById("stdin-input");

    runBtn.addEventListener("click", async () => {
        const code = editor.getValue();
        const inputData = stdinInput.value;

        // Auto-save first
        await fetch("/api/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code })
        });
        statusIndicator.innerText = "Saved";

        // Add "Running..." indicator
        const runLine = document.createElement("div");
        runLine.className = "term-line";
        runLine.style.color = "#58a6ff";
        runLine.innerText = "> Running script...";
        terminalOutput.appendChild(runLine);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;

        try {
            const response = await fetch("/api/run", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input: inputData })
            });
            
            const data = await response.json();
            
            // Display Output
            const outLine = document.createElement("div");
            outLine.className = "term-line";
            outLine.innerText = data.output;
            terminalOutput.appendChild(outLine);
            
            // Scroll to bottom
            terminalOutput.scrollTop = terminalOutput.scrollHeight;

        } catch (error) {
            const errLine = document.createElement("div");
            errLine.className = "term-line";
            errLine.style.color = "#ff4b4b";
            errLine.innerText = "Error calling execution API.";
            terminalOutput.appendChild(errLine);
        }
    });

    // Clear Terminal
    clearTermBtn.addEventListener("click", () => {
        terminalOutput.innerHTML = '<div class="term-line">Ready to run...</div>';
    });
});
