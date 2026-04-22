import React, { useRef, useState } from 'react'

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

const PROPERTY_PAIR_STYLES = [
  {
    chip: 'bg-amber-100 text-amber-900 border-amber-300',
    panel: 'border-amber-300 bg-amber-50/55',
    highlight: 'bg-amber-200/70 text-amber-900',
  },
  {
    chip: 'bg-sky-100 text-sky-900 border-sky-300',
    panel: 'border-sky-300 bg-sky-50/55',
    highlight: 'bg-sky-200/70 text-sky-900',
  },
  {
    chip: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    panel: 'border-emerald-300 bg-emerald-50/55',
    highlight: 'bg-emerald-200/70 text-emerald-900',
  },
  {
    chip: 'bg-rose-100 text-rose-900 border-rose-300',
    panel: 'border-rose-300 bg-rose-50/55',
    highlight: 'bg-rose-200/70 text-rose-900',
  },
]

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

function buildConcatenatedPropertyText(entries) {
  return entries.map((entry) => `${entry.name}${entry.value}`).join('')
}

function normalizePropertyPairsFromJson(parsedJson) {
  if (Array.isArray(parsedJson)) {
    return parsedJson
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const name = typeof item.name === 'string' ? item.name : item.key
        const value = typeof item.value === 'string' ? item.value : ''
        if (typeof name !== 'string' || !name.trim()) return null
        return { name: name.trim(), value }
      })
      .filter(Boolean)
  }

  if (parsedJson && typeof parsedJson === 'object') {
    return Object.entries(parsedJson)
      .filter(([name]) => typeof name === 'string' && name.trim())
      .map(([name, value]) => ({
        name: name.trim(),
        value: value == null ? '' : String(value),
      }))
  }

  return []
}

function applyPropertyEditsToSource(sourceText, entries) {
  if (!sourceText) return ''
  if (!entries.length) return sourceText

  let reconstructed = sourceText
  entries.forEach((entry) => {
    const replacement = `${entry.name}${entry.value}`
    if (!entry.originalSnippet) return
    reconstructed = reconstructed.replace(entry.originalSnippet, replacement)
  })

  return reconstructed
}

function buildSourceHighlights(sourceText, entries) {
  if (!sourceText || !entries.length) return []

  const highlights = []
  let cursor = 0

  entries.forEach((entry, pairIndex) => {
    if (!entry.originalSnippet) return
    const start = sourceText.indexOf(entry.originalSnippet, cursor)
    if (start === -1) return
    const end = start + entry.originalSnippet.length
    highlights.push({ start, end, pairIndex })
    cursor = end
  })

  return highlights
}

function buildReconstructedWithHighlights(sourceText, entries) {
  if (!sourceText) return { text: '', highlights: [] }
  if (!entries.length) return { text: sourceText, highlights: [] }

  let cursor = 0
  let reconstructed = ''
  const highlights = []

  entries.forEach((entry, pairIndex) => {
    if (!entry.originalSnippet) return
    const start = sourceText.indexOf(entry.originalSnippet, cursor)
    if (start === -1) return

    reconstructed += sourceText.slice(cursor, start)
    const replacement = `${entry.name}${entry.value}`
    const highlightStart = reconstructed.length
    reconstructed += replacement
    highlights.push({
      start: highlightStart,
      end: highlightStart + replacement.length,
      pairIndex,
    })

    cursor = start + entry.originalSnippet.length
  })

  reconstructed += sourceText.slice(cursor)
  return { text: reconstructed, highlights }
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
  const [propertySourceText, setPropertySourceText] = useState('')
  const [propertyEntries, setPropertyEntries] = useState([])
  const [selectedPropertyText, setSelectedPropertyText] = useState('')
  const propertySourceRef = useRef(null)

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

  function handlePropertyFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()

    reader.onload = (ev) => {
      const convertedText = ev.target.result
      setPropertySourceText(convertedText)
      setPropertyEntries([])
      setSelectedPropertyText('')
      showToast('Converted text loaded for manual property selection')
    }

    reader.readAsText(file)
  }

  function handlePropertySelection() {
    const container = propertySourceRef.current
    const selection = window.getSelection()
    if (!container || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    const common = range.commonAncestorContainer
    const isInsidePreview = container.contains(common.nodeType === 1 ? common : common.parentNode)

    if (!isInsidePreview) {
      return
    }

    const text = selection.toString()
    if (!text) {
      setSelectedPropertyText('')
      return
    }

    setSelectedPropertyText(text)
  }

  function addSelectedProperty() {
    const snippet = selectedPropertyText.trim()
    if (!snippet) {
      showToast('Highlight a property snippet first')
      return
    }

    const match = snippet.match(/([A-Za-z0-9_]+Property)([\s\S]*)/)
    if (!match) {
      showToast('Could not parse selected snippet as Property+Value')
      return
    }

    const entry = {
      id: `prop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: match[1],
      value: match[2] || '',
      originalSnippet: snippet,
    }

    setPropertyEntries((prev) => [...prev, entry])
    showToast('Property added to editable list')
  }

  function updatePropertyEntry(id, field, value) {
    setPropertyEntries((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, [field]: value } : entry))
    )
  }

  function savePropertiesJson() {
    if (!propertyEntries.length) return
    const keyValuePairs = Object.fromEntries(
      propertyEntries.map((entry) => [entry.name, entry.value])
    )
    const json = JSON.stringify(keyValuePairs, null, 2)
    downloadFile(json, 'property_keys.json', 'application/json')
    showToast('Property keys exported as JSON')
  }

  function handleImportPropertyKeys(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        const pairs = normalizePropertyPairsFromJson(parsed)
        if (!pairs.length) {
          showToast('No valid key/value pairs found in JSON')
          return
        }

        const importedEntries = pairs.map((pair, index) => ({
          id: `prop-import-${Date.now()}-${index}`,
          name: pair.name,
          value: pair.value,
          originalSnippet: `${pair.name}${pair.value}`,
        }))

        setPropertyEntries(importedEntries)
        setSelectedPropertyText('')

        const matches = buildSourceHighlights(propertySourceText, importedEntries).length
        showToast(`Imported ${importedEntries.length} properties (${matches} matched in source)`)
      } catch {
        showToast('Invalid JSON file')
      }
    }

    reader.readAsText(file)
    e.target.value = ''
  }

  function downloadPropertyText() {
    const reconstructed = applyPropertyEditsToSource(propertySourceText, propertyEntries)
    if (!reconstructed) return
    downloadFile(reconstructed, 'property_editor_converted_text.txt', 'text/plain;charset=utf-8')
    showToast('Property text file downloaded')
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
  const hasPropertyEntries = propertyEntries.length > 0
  const parsedNumbers = numberCount(inputText)
  const textToAsciiSeparator = textToAsciiFormat === 'comma' ? ', ' : ' '
  const textToAsciiOutputPreview = textToAsciiCodesPreview.join(textToAsciiSeparator)
  const propertySourceHighlights = buildSourceHighlights(propertySourceText, propertyEntries)
  const propertyReconstructedResult = buildReconstructedWithHighlights(propertySourceText, propertyEntries)
  const propertyReconstructedPreview = propertyReconstructedResult.text

  function renderHighlightedText(text, highlights) {
    if (!text) {
      return <span className="text-slate-400">No preview available yet.</span>
    }

    if (!highlights.length) {
      return <span>{text}</span>
    }

    const nodes = []
    let cursor = 0

    highlights.forEach((highlight, index) => {
      if (highlight.start > cursor) {
        nodes.push(
          <span key={`plain-${index}-${cursor}`}>{text.slice(cursor, highlight.start)}</span>
        )
      }

      const styleSet = PROPERTY_PAIR_STYLES[highlight.pairIndex % PROPERTY_PAIR_STYLES.length]
      nodes.push(
        <span
          key={`hl-${index}-${highlight.start}`}
          className={`${styleSet.highlight} rounded px-0.5`}
        >
          {text.slice(highlight.start, highlight.end)}
        </span>
      )

      cursor = highlight.end
    })

    if (cursor < text.length) {
      nodes.push(<span key="plain-tail">{text.slice(cursor)}</span>)
    }

    return nodes
  }

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
        <button
          role="tab"
          aria-selected={activeTab === 'property-editor'}
          aria-controls="property-editor-panel"
          id="property-editor-tab"
          onClick={() => setActiveTab('property-editor')}
          className={`ml-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'property-editor'
              ? 'bg-accent text-white'
              : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Property Editor
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

      {activeTab === 'property-editor' && (
      <section
        className="card p-5 sm:p-6"
        role="tabpanel"
        id="property-editor-panel"
        aria-labelledby="property-editor-tab"
      >
        <h2 className="text-lg font-semibold text-slate-900">Property Editor</h2>
        <p className="mt-1 text-sm text-slate-600">
          Upload an already-converted text file, highlight specific property snippets, add them to a manual editable list, then export reconstructed text.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="property-upload" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
            Choose converted text .txt file
          </label>
          <input
            id="property-upload"
            type="file"
            accept=".txt"
            onChange={handlePropertyFile}
            className="sr-only"
          />
          <span className="text-xs text-slate-500">Then highlight a snippet like MountNameStrPropertyFrankie and click Add Property.</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label htmlFor="property-import-keys" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400">
            Import Property Keys
          </label>
          <input
            id="property-import-keys"
            type="file"
            accept=".json"
            onChange={handleImportPropertyKeys}
            className="sr-only"
          />
          <span className="text-xs text-slate-500">Load a key/value JSON file and auto-highlight matching pairs.</span>
        </div>

        <div className="mt-4 rounded-xl bg-panel p-3 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">Properties in list:</span> {propertyEntries.length}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Input preview</h3>
            <div
              ref={propertySourceRef}
              aria-label="Property editor source preview"
              onMouseUp={handlePropertySelection}
              onKeyUp={handlePropertySelection}
              className="mt-2 max-h-[18.5rem] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-sm leading-6 text-slate-800 whitespace-pre-wrap break-words"
            >
              {renderHighlightedText(propertySourceText, propertySourceHighlights)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={addSelectedProperty}
                disabled={!selectedPropertyText.trim()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
              >
                Add Property
              </button>
              <span className="text-xs text-slate-500">
                Selected chars: {selectedPropertyText.length}
              </span>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Reconstructed output preview</h3>
            <div
              aria-label="Property editor output preview"
              className="mt-2 max-h-[18.5rem] overflow-auto rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm leading-6 text-slate-900 whitespace-pre-wrap break-words"
            >
              {renderHighlightedText(propertyReconstructedPreview, propertyReconstructedResult.highlights)}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {propertyEntries.map((entry, index) => {
            const styleSet = PROPERTY_PAIR_STYLES[index % PROPERTY_PAIR_STYLES.length]
            return (
              <span
                key={`legend-${entry.id}`}
                className={`rounded-full border px-2 py-1 text-xs font-semibold ${styleSet.chip}`}
              >
                Pair {index + 1}
              </span>
            )
          })}
        </div>

        <div className="mt-6 space-y-4">
          {propertyEntries.map((entry, index) => (
            <div
              key={entry.id}
              className={`rounded-xl border bg-white p-4 ${PROPERTY_PAIR_STYLES[index % PROPERTY_PAIR_STYLES.length].panel}`}
            >
              <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Property {index + 1}
              </p>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[280px_1fr]">
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updatePropertyEntry(entry.id, 'name', e.target.value)}
                  aria-label={`Property name ${index + 1}`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
                <textarea
                  value={entry.value}
                  onChange={(e) => updatePropertyEntry(entry.id, 'value', e.target.value)}
                  rows={2}
                  aria-label={`Property value ${index + 1}`}
                  className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                />
              </div>
            </div>
          ))}
          {!hasPropertyEntries && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              Upload a converted text file, highlight snippets, and add editable property name/value pairs.
            </div>
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={downloadPropertyText}
            disabled={!hasPropertyEntries}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Convert to Text
          </button>
          <button
            onClick={savePropertiesJson}
            disabled={!hasPropertyEntries}
            className="ml-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            Save Properties
          </button>
        </div>
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
