import { useState } from "react";
import axios from "axios";

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { sender: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
     setInput("");
    try {
      const res = await axios.post(
        "http://localhost:3000/chat/create",
        { message: input },
        { headers: { "Content-Type": "application/json" } }
      );

      const botMsg = { sender: "bot", text: res.data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "⚠️ Something went wrong." },
      ]);
    }

   
  };

  return (
    <div className="fixed bottom-6 right-6 z-[1200]">

      {/* Floating Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="
            bg-gradient-to-br from-violet-600 to-cyan-500
            text-white px-5 py-4 rounded-full 
            font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.4)]
            hover:scale-105 transition-transform duration-200
          "
        >
          💬 Chat with us
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div
          className="
            w-80 h-96 flex flex-col
            rounded-2xl overflow-hidden
            bg-[rgba(20,22,34,0.92)]
            backdrop-blur-xl
            border border-[rgba(255,255,255,0.08)]
            shadow-[0_10px_30px_rgba(0,0,0,0.45)]
            animate-fadeInUp
          "
        >
          {/* Header */}
          <div
            className="
              px-4 py-3 flex justify-between items-center
              bg-gradient-to-br from-violet-600 to-cyan-500
              text-white font-semibold
            "
          >
            <span>Ghumakkad AI</span>
            <button onClick={() => setOpen(false)} className="text-lg">
              ✖
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 no-scrollbar">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`
                  max-w-[75%] px-3 py-2 rounded-xl text-sm
                  ${
                    m.sender === "user"
                      ? "bg-gradient-to-br from-violet-600 to-cyan-600 ml-auto"
                      : "bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)]"
                  }
                `}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-3 flex gap-2">
            <input
              className="
                flex-1 px-3 py-2 text-white rounded-xl
                bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)]
                placeholder:text-[#9aa4c3]
                focus:outline-none focus:ring-2 focus:ring-cyan-500
              "
              placeholder="Ask something..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />

            <button
              onClick={sendMessage}
              className="
                px-4 bg-gradient-to-br from-cyan-500 to-violet-600
                rounded-xl text-white font-semibold
                hover:scale-105 transition-transform duration-200
              "
            >
              ➤
            </button>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>
        {`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out;
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}
      </style>
    </div>
  );
}
