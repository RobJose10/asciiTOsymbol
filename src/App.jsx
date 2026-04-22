import React, { useState } from 'react'

const CONTROL_LABELS = {
  0: 'NUL',
  1: 'SOH',
  2: 'STX',
  3: 'ETX',
  4: 'EOT',
  5: 'ENQ',
  6: 'ACK',
  7: 'BEL',
  8: 'BS',
  9: 'TAB',
  10: 'LF',
  11: 'VT',
  12: 'FF',
  13: 'CR',
  14: 'SO',
  15: 'SI',
  16: 'DLE',
  17: 'DC1',
  18: 'DC2',
  19: 'DC3',
  20: 'DC4',
  21: 'NAK',
  22: 'SYN',
  23: 'ETB',
  24: 'CAN',
  25: 'EM',
  26: 'SUB',
  27: 'ESC',
  28: 'FS',
  29: 'GS',
  30: 'RS',
  31: 'US',
  127: 'DEL',
}

const TOKEN_TO_CONTROL_CODE = Object.fromEntries(
  Object.entries(CONTROL_LABELS).map(([code, label]) => [label, Number(code)])
)

function toVisibleAscii(code) {
  if (code >= 32 && code <= 126) return String.fromCharCode(code)
  if (Object.prototype.hasOwnProperty.call(CONTROL_LABELS, code)) {
    return `[${CONTROL_LABELS[code]}]`
  }
  return ''
}

function textToAsciiCodes(text) {
  const codes = []
  let i = 0

  while (i < text.length) {
    if (text[i] === '[') {
      const closeIndex = text.indexOf(']', i + 1)
      if (closeIndex !== -1) {
        const tokenName = text.slice(i + 1, closeIndex)
        if (Object.prototype.hasOwnProperty.call(TOKEN_TO_CONTROL_CODE, tokenName)) {
          codes.push(TOKEN_TO_CONTROL_CODE[tokenName])
          i = closeIndex + 1
          continue
        }
      }
    }

    codes.push(text.charCodeAt(i))
    i += 1
  }

  return codes
}

function parseAsciiNumbers(text) {
  const nums = text.match(/\d+/g)
  if (!nums) return ''
  return nums
    .map((n) => {
      const x = parseInt(n, 10)
      if (isNaN(x)) return ''
      return toVisibleAscii(x)
    })
    .join('')
}

function extractVariablesAndNumbers(text) {
  const lines = text.split(/\r?\n/)
  const result = {}
  const defaultKey = 'data'

  lines.forEach((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([\d\s]+)/)
    if (match) {
      const key = match[1]
      const nums = match[2]
        .trim()
        .split(/\s+/)
        .map(Number)
        .filter((n) => !isNaN(n))
      const textVal = nums.map((x) => toVisibleAscii(x)).join('')
      if (nums.length) result[key] = { numbers: nums, text: textVal }
      return
    }

    const nums = line
      .trim()
      .split(/\s+/)
      .map(Number)
      .filter((n) => !isNaN(n))
    const textVal = nums.map((x) => toVisibleAscii(x)).join('')

    if (nums.length) {
      if (!result[defaultKey]) result[defaultKey] = { numbers: [], text: '' }
      result[defaultKey].numbers.push(...nums)
      result[defaultKey].text += textVal
    }
  })

  return result
}

function downloadFile(content, fileName, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function numberCount(text) {
  const nums = text.match(/\d+/g)
  return nums ? nums.length : 0
}


export default function App() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')
  const [toast, setToast] = useState('')
  const [activeTab, setActiveTab] = useState('numbers-to-text')
  const [textToAsciiFormat, setTextToAsciiFormat] = useState('space')
  const [textToAsciiSource, setTextToAsciiSource] = useState('')
  const [textToAsciiCodesPreview, setTextToAsciiCodesPreview] = useState([])

  function showToast(message) {
    setToast(message)
    window.clearTimeout(showToast._timer)
    showToast._timer = window.setTimeout(() => setToast(''), 2200)
  }

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setInputText(ev.target.result)
      const parsed = parseAsciiNumbers(ev.target.result)
      setOutputText(parsed)
      showToast('Numeric ASCII file loaded')
    }
    reader.readAsText(file)
  }

  function handleOutputEdit(e) {
    const nextText = e.target.value
    setOutputText(nextText)
    setInputText(textToAsciiCodes(nextText).join(', '))
  }

  function handleAsciiFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const asciiText = ev.target.result
      const codes = textToAsciiCodes(asciiText)
      setTextToAsciiSource(asciiText)
      setTextToAsciiCodesPreview(codes)
      showToast('Text loaded for ASCII preview')
    }
    reader.readAsText(file)
  }

  function downloadTextToAsciiPreview() {
    if (!textToAsciiCodesPreview.length) return
    const separator = textToAsciiFormat === 'comma' ? ', ' : ' '
    const fileName = 'ascii_values.txt'
    const asciiCodes = textToAsciiCodesPreview.join(separator)
    downloadFile(asciiCodes, fileName, 'text/plain;charset=utf-8')
    showToast('ASCII values exported')
  }

  function reverseToAscii() {
    const asciiCodes = textToAsciiCodes(outputText).join(', ')
    downloadFile(asciiCodes, 'reversed_ascii_codes.txt', 'text/plain;charset=utf-8')
    showToast('Reversed ASCII file downloaded')
  }

  function downloadOutput() {
    downloadFile(outputText, 'converted_text.txt', 'text/plain;charset=utf-8')
    showToast('Converted text file downloaded')
  }

  function downloadJson() {
    const variables = extractVariablesAndNumbers(inputText)
    const json = JSON.stringify(
      {
        converted: outputText,
        variables,
      },
      null,
      2
    )
    downloadFile(json, 'converted.json', 'application/json')
    showToast('JSON export downloaded')
  }

  async function copyOutput() {
    if (!outputText) return
    try {
      await navigator.clipboard.writeText(outputText)
      showToast('Copied converted output')
    } catch {
      showToast('Copy failed in this browser')
    }
  }

  const hasOutput = Boolean(outputText)
  const hasTextToAsciiPreview = textToAsciiCodesPreview.length > 0
  const parsedNumbers = numberCount(inputText)
  const textToAsciiSeparator = textToAsciiFormat === 'comma' ? ', ' : ' '
  const textToAsciiOutputPreview = textToAsciiCodesPreview.join(textToAsciiSeparator)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="mb-2 inline-flex rounded-full bg-accentSoft px-3 py-1 text-xs font-semibold tracking-[0.12em] text-teal-900 uppercase">
          Productivity Toolkit
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          ASCII Converter Workspace
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
          Convert numeric ASCII streams to text, export clean files, and reverse text back into ASCII values from one focused dashboard.
        </p>
        <p className="mt-2 max-w-2xl text-xs text-slate-500 sm:text-sm">
          Non-printable ASCII control characters are preserved as tokens such as [NUL], [TAB], [LF], [CR], and [ESC].
        </p>
      </header>

      <div className="card mb-6 p-2" role="tablist" aria-label="Conversion modes">
        <button
          role="tab"
          aria-selected={activeTab === 'numbers-to-text'}
          aria-controls="numbers-to-text-panel"
          id="numbers-to-text-tab"
          onClick={() => setActiveTab('numbers-to-text')}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'numbers-to-text'
              ? 'bg-accent text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          ASCII to Text
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'text-to-ascii'}
          aria-controls="text-to-ascii-panel"
          id="text-to-ascii-tab"
          onClick={() => setActiveTab('text-to-ascii')}
          className={`ml-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'text-to-ascii'
              ? 'bg-accent text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Text to ASCII
        </button>
      </div>

      {activeTab === 'numbers-to-text' && (
        <>
          <section
            className="card mb-6 p-5 sm:p-6"
            role="tabpanel"
            id="numbers-to-text-panel"
            aria-labelledby="numbers-to-text-tab"
          >
            <h2 id="upload-numeric-title" className="text-lg font-semibold text-slate-900">
              Upload Numeric ASCII File
            </h2>
            <p className="mt-1 text-sm text-slate-600">Accepted format: plain text with numbers separated by spaces or lines.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label htmlFor="numeric-upload" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
                Choose .txt file
              </label>
              <input
                id="numeric-upload"
                type="file"
                accept=".txt"
                onChange={handleFile}
                className="sr-only"
              />
              <span className="text-xs text-slate-500">Load to auto-convert into readable text.</span>
            </div>
          </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Input: raw numbers</h3>
          <textarea
            value={inputText}
            readOnly
            rows={12}
            aria-label="Input raw ASCII numbers"
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
        </div>

        <div className="card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Output: converted text</h3>
          <textarea
            value={outputText}
            onChange={handleOutputEdit}
            rows={12}
            aria-label="Converted output text"
            className="mt-3 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
          />
          <p className="mt-2 text-xs text-slate-500">
            Edits here update the ASCII input preview and are used by Reverse to ASCII.
          </p>
        </div>
      </section>

      <section className="card mb-6 p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">Actions</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={downloadOutput}
            disabled={!hasOutput}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Download text
          </button>
          <button
            onClick={reverseToAscii}
            disabled={!hasOutput}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Reverse to ASCII
          </button>
          <button
            onClick={downloadJson}
            disabled={!hasOutput}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Export JSON
          </button>
          <button
            onClick={copyOutput}
            disabled={!hasOutput}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Copy output
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-3">
          <div className="rounded-xl bg-panel p-3">
            <p className="text-xs tracking-wide text-slate-500 uppercase">Parsed numbers</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{parsedNumbers}</p>
          </div>
          <div className="rounded-xl bg-panel p-3">
            <p className="text-xs tracking-wide text-slate-500 uppercase">Output length</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{outputText.length}</p>
          </div>
          <div className="rounded-xl bg-panel p-3">
            <p className="text-xs tracking-wide text-slate-500 uppercase">Variables parsed</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {Object.keys(extractVariablesAndNumbers(inputText)).length}
            </p>
          </div>
        </div>
      </section>

        </>
      )}

      {activeTab === 'text-to-ascii' && (
      <section
        className="card p-5 sm:p-6"
        role="tabpanel"
        id="text-to-ascii-panel"
        aria-labelledby="text-to-ascii-tab"
      >
        <h2 id="reverse-upload-title" className="text-lg font-semibold text-slate-900">
          Upload Text to Export ASCII Values
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload a plain text file and instantly save its ASCII code sequence.
        </p>
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-slate-600 uppercase">Output format</p>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-700">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="text-to-ascii-format"
                value="space"
                checked={textToAsciiFormat === 'space'}
                onChange={() => setTextToAsciiFormat('space')}
                className="h-4 w-4 border-slate-300 text-teal-700 focus:ring-teal-200"
              />
              Space separated
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="text-to-ascii-format"
                value="comma"
                checked={textToAsciiFormat === 'comma'}
                onChange={() => setTextToAsciiFormat('comma')}
                className="h-4 w-4 border-slate-300 text-teal-700 focus:ring-teal-200"
              />
              Comma separated
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="ascii-upload" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
            Choose text file
          </label>
          <input
            id="ascii-upload"
            type="file"
            accept=".txt"
            onChange={handleAsciiFile}
            className="sr-only"
          />
          <span className="text-xs text-slate-500">
            Prepares ascii_values.txt after upload.
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Input preview</h3>
            <textarea
              value={textToAsciiSource}
              readOnly
              rows={10}
              placeholder="Upload a text file to preview its content."
              aria-label="Text to ASCII input preview"
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Output preview</h3>
            <textarea
              value={textToAsciiOutputPreview}
              readOnly
              rows={10}
              placeholder="ASCII values will appear here after upload."
              aria-label="Text to ASCII output preview"
              className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={downloadTextToAsciiPreview}
            disabled={!hasTextToAsciiPreview}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Download ASCII file
          </button>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Use this mode when your source file contains plain text and you want its numeric ASCII sequence. Tokens like [LF] and [ESC] are converted back to their control codes.
        </p>
      </section>
      )}

      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-none fixed right-5 bottom-5 rounded-xl px-4 py-2 text-sm font-medium text-white shadow-lg transition ${
          toast ? 'translate-y-0 bg-slate-900 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        {toast}
      </div>
    </div>
  )
}
