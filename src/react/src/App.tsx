"use client"

import { useEffect, useState } from "react"

export default function App() {
  const [questions, setQuestions] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [hasUploadedFile, setHasUploadedFile] = useState(false)
  const [isGeneratingMore, setIsGeneratingMore] = useState(false)

  useEffect(() => {
    const ipcRenderer = window.electron?.ipcRenderer
    if (!ipcRenderer) {
      console.error("ipcRenderer not available")
      return
    }

    ipcRenderer.on("set-questions", (_, rawQuestions) => {
      console.log("[React] Received questions:", rawQuestions)

      let qList = []
      if (typeof rawQuestions === "string") {
        qList = rawQuestions.split(/\n?\d+\.\s+/).filter(Boolean)
      } else if (Array.isArray(rawQuestions)) {
        qList = rawQuestions
      }

      setQuestions(qList)
      setIsUploading(false)
      setHasUploadedFile(true)
    })

    ipcRenderer.on("additional-questions", (_, additionalQuestions) => {
      console.log("[React] Received additional questions:", additionalQuestions)
      console.log(additionalQuestions)
      let newQuestions = []
      if (typeof additionalQuestions === "string") {

        newQuestions = additionalQuestions.split(/\n?\d+\.\s+/).filter(Boolean)
      } else if (Array.isArray(additionalQuestions)) {
        newQuestions = additionalQuestions
      }

      setQuestions((prev) => [...prev, ...newQuestions])
      setIsGeneratingMore(false)
    })

    return () => {
      if (ipcRenderer?.removeAllListeners) {
        ipcRenderer.removeAllListeners("set-questions")
        ipcRenderer.removeAllListeners("additional-questions")
      }
    }
  }, [])

  const handleFileUpload = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/pdf"
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (file.type !== "application/pdf") {
        alert("Please upload a PDF file.")
        return
      }

      setIsUploading(true)

      try {
        const arrayBuffer = await file.arrayBuffer()
        const ipcRenderer = window.electron?.ipcRenderer

        if (ipcRenderer) {
          const result = await ipcRenderer.invoke("interview:uploadResumePdf", {
            buffer: arrayBuffer,
            name: file.name,
          })

          if (!result.success) {
            alert(result.error || "Failed to generate interview questions.")
            setIsUploading(false)
          }
        }
      } catch (err) {
        console.error("Failed to upload/process PDF:", err)
        alert("Failed to process PDF.")
        setIsUploading(false)
      }
    }

    input.click()
  }

  const handleGenerateMore = async () => {
    setIsGeneratingMore(true)

    try {
      const ipcRenderer = window.electron?.ipcRenderer
      if (ipcRenderer) {
        const result = await ipcRenderer.invoke("interview:generateMoreQuestions")

        if (!result.success) {
          alert(result.error || "Failed to generate additional questions.")
          setIsGeneratingMore(false)
        }
        else {
          setIsGeneratingMore(false)
        }
      }
    } catch (err) {
      console.error("Failed to generate more questions:", err)
      alert("Failed to generate additional questions.")
      setIsGeneratingMore(false)
    }
  }
  const handleClearQuestions = () => {
  setQuestions([]);
  setHasUploadedFile(false);
};


  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        width: "100vw",

        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)",
        position: "relative",

      }}
    >
    <div
  style={{
    position: "absolute",
    top: "10px",
    right: "10px",
    zIndex: 999,
  }}
>
  <button
    onClick={() => {
      window.electron?.ipcRenderer?.invoke('mainHeader:openInterviewWindow');
    }}
    title="Close"
    style={{
      background: "transparent",
      border: "none",
      fontSize: "20px",
      color: "white",
      cursor: "pointer",
      outline: "none",       // prevents focus outline
    boxShadow: "none",     // removes focus ring glow (on macOS especially)
    WebkitTapHighlightColor: "transparent",
    }}
  >
    ✖
  </button>
</div>


      {/* Background overlay for additional depth */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />

      <h2
        style={{
          textAlign: "center",
          marginBottom: "30px",
          color: "#ffffff",
          fontSize: "24px",
          fontWeight: "600",
          textShadow: "0 2px 10px rgba(0,0,0,0.5)",
        }}
      >
        Interview Questions
       
      </h2>

      {!hasUploadedFile ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "30px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            transition: "all 0.3s ease",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              width: "80px",
              height: "80px",
              background: "linear-gradient(135deg, rgba(52, 152, 219, 0.8) 0%, rgba(155, 89, 182, 0.8) 100%)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              boxShadow: "0 8px 25px rgba(52, 152, 219, 0.3)",
              position: "relative",
              zIndex: 1,
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 16V4M12 16L8 12M12 16L16 12"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect x="4" y="18" width="16" height="2" rx="1" fill="white" />
            </svg>
          </div>

          <h3
            style={{
              marginBottom: "10px",
              color: "#ffffff",
              fontSize: "20px",
              fontWeight: "500",
              position: "relative",
              zIndex: 1,
            }}
          >
            {isUploading ? "Processing Resume..." : "Upload Your Resume"}
          </h3>

          <p
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              marginBottom: "25px",
              textAlign: "center",
              maxWidth: "300px",
              position: "relative",
              zIndex: 1,
            }}
          >
            {isUploading
              ? "Generating personalized interview questions..."
              : "Upload your PDF resume to get personalized interview questions"}
          </p>

          <button
            onClick={handleFileUpload}
            disabled={isUploading}
            style={{
              background: isUploading
                ? "rgba(149, 165, 166, 0.3)"
                : "linear-gradient(135deg, rgba(52, 152, 219, 0.8) 0%, rgba(155, 89, 182, 0.8) 100%)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              padding: "12px 24px",
              borderRadius: "12px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: isUploading ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              minWidth: "140px",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: isUploading
                ? "0 4px 15px rgba(0, 0, 0, 0.2)"
                : "0 8px 25px rgba(52, 152, 219, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
              position: "relative",
              zIndex: 1,
              transform: isUploading ? "scale(0.98)" : "scale(1)",
            }}
          >
            {isUploading ? "Uploading..." : "Choose PDF File"}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: "20px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            padding: "30px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle gradient overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)",
              pointerEvents: "none",
            }}
          />

          {questions.length > 0 ? (
            <div style={{ marginBottom: "30px", position: "relative", zIndex: 1 }}>
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(0,0,0, 0.4)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    padding: "12px",
                    marginBottom: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderLeft: "4px solid rgba(52, 152, 219, 0.8)",
                    boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)",
                    transition: "all 0.3s ease",
                  }}
                >
                  <div
                    style={{
                      fontWeight: "600",
                      color: "rgba(52, 152, 219, 0.9)",
                      fontSize: "14px",
                      marginBottom: "5px",
                    }}
                    

                  >
                    Question {idx + 1}
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.9)",
                      lineHeight: "1.6",
                    }}
                  >
                    {q.trim()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.5)",
                fontStyle: "italic",
                marginBottom: "30px",
                position: "relative",
                zIndex: 1,
              }}
            >
              No questions available.
            </div>
          )}

          <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
            <button
              onClick={handleGenerateMore}
              disabled={isGeneratingMore}
              style={{
                background: isGeneratingMore
                  ? "rgba(149, 165, 166, 0.3)"
                  : "linear-gradient(135deg, rgba(39, 174, 96, 0.8) 0%, rgba(46, 204, 113, 0.8) 100%)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                padding: "12px 24px",
                borderRadius: "12px",
                fontSize: "16px",
                fontWeight: "500",
                cursor: isGeneratingMore ? "not-allowed" : "pointer",
                transition: "all 0.3s ease",
                minWidth: "160px",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: isGeneratingMore
                  ? "0 4px 15px rgba(0, 0, 0, 0.2)"
                  : "0 8px 25px rgba(39, 174, 96, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
                transform: isGeneratingMore ? "scale(0.98)" : "scale(1)",
              }}
            >
              {isGeneratingMore ? "Generating..." : "Generate More"}
            </button>
              <div className="text-center mt-5 z-[1]">
                <button
                  onClick={handleClearQuestions}
                  className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-3 rounded-xl font-medium shadow-lg border border-white/20 backdrop-blur-md hover:scale-105 transition-all duration-300"
                >
                  Clear Questions
                </button>
              </div>

          </div>
        </div>
      )}
    </div>
  )
}
