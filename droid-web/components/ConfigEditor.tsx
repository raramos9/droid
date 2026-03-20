"use client"

import { useState } from "react"

interface Props {
  url: string
  fetchKey: string
  initialValue?: string
  extraBody?: Record<string, string>
}

type SaveState = "idle" | "saving" | "saved" | "error"

export function ConfigEditor({ url, fetchKey, initialValue = "", extraBody }: Props) {
  const [value, setValue] = useState(initialValue)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSave() {
    setSaveState("saving")
    setErrorMsg("")
    try {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...extraBody, [fetchKey]: value }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Save failed")
        setSaveState("error")
      } else {
        setSaveState("saved")
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Unknown error")
      setSaveState("error")
    }
  }

  const isSaving = saveState === "saving"

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          if (saveState !== "idle") setSaveState("idle")
        }}
        rows={16}
        style={{
          width: "100%",
          fontFamily: "var(--font-mono)",
          fontSize: "0.8rem",
          padding: "10px 12px",
          background: "var(--surface-raised)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          color: "var(--text-primary)",
          resize: "vertical",
          outline: "none",
          lineHeight: 1.6,
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary"
          style={{ fontSize: "0.8rem", padding: "5px 14px" }}
        >
          {isSaving ? "Saving..." : "Save"}
        </button>
        {saveState === "saved" && (
          <span style={{ fontSize: "0.8rem", color: "var(--status-success)" }}>Saved</span>
        )}
        {saveState === "error" && (
          <span style={{ fontSize: "0.8rem", color: "var(--status-error)" }}>{errorMsg}</span>
        )}
      </div>
    </div>
  )
}
