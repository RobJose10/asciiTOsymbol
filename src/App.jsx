import React, { useState } from 'react'

function parseAsciiNumbers(text) {
  const nums = text.match(/\d+/g)
  if (!nums) return ''
  return nums
    .map((n) => {
      const x = parseInt(n, 10)
      if (isNaN(x)) return ''
      if (x === 10) return '\n'
      if (x === 13) return '\r'
      if (x === 9) return '\t'
      if (x >= 32 && x <= 126) return String.fromCharCode(x)
      // other bytes as replacement char
      return ''
    })
    .join('')
}



export default function App() {
  const [inputText, setInputText] = useState('')
  const [outputText, setOutputText] = useState('')

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setInputText(ev.target.result)
      const parsed = parseAsciiNumbers(ev.target.result)
      setOutputText(parsed)
    }
    reader.readAsText(file)
  }

function handleAsciiFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const asciiText = ev.target.result;
    const asciiCodes = asciiText
      .split('')
      .map(c => c.charCodeAt(0))
      .join(' ');
    // Save as new file
    const blob = new Blob([asciiCodes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ascii_values.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  reader.readAsText(file);
}

  function reverseToAscii() {
  // Convert outputText back to ASCII codes, separated by spaces
  const asciiCodes = outputText
    .split('')
    .map(c => c.charCodeAt(0))
    .join(' ');
  const blob = new Blob([asciiCodes], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'reversed.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

  function downloadOutput() {
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'new2.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

function downloadJson() {
  const variables = extractVariablesAndNumbers(inputText);
  const json = JSON.stringify({
    converted: outputText,
    variables: variables
  }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function extractVariablesAndNumbers(text) {
  // Output: { TalentLevel1: { numbers: [65,66,67], text: "ABC" }, ... }
  const lines = text.split(/\r?\n/);
  const result = {};
  let defaultKey = 'data';
  lines.forEach(line => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+([\d\s]+)/);
    if (match) {
      const key = match[1];
      const nums = match[2].trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
      const textVal = nums.map(x => (x >= 32 && x <= 126) ? String.fromCharCode(x) : '').join('');
      if (nums.length) result[key] = { numbers: nums, text: textVal };
    } else {
      // If no variable name, just numbers
      const nums = line.trim().split(/\s+/).map(Number).filter(n => !isNaN(n));
      const textVal = nums.map(x => (x >= 32 && x <= 126) ? String.fromCharCode(x) : '').join('');
      if (nums.length) {
        if (!result[defaultKey]) result[defaultKey] = { numbers: [], text: '' };
        result[defaultKey].numbers.push(...nums);
        result[defaultKey].text += textVal;
      }
    }
  });
  return result;
}
  return (
    <div className="container">
      <h1>ASCII to Text Converter</h1>
      <input type="file" accept=".txt" onChange={handleFile} />

      <div className="pane">
        <div>
          <h3>Input (raw numbers)</h3>
          <textarea value={inputText} readOnly rows={10} />
        </div>
        <div>
          <h3>Output (converted)</h3>
          <textarea value={outputText} readOnly rows={10} />
        </div>
      </div>

      <button onClick={downloadOutput} disabled={!outputText}>
        Save as new2.txt
      </button>
<button onClick={reverseToAscii} disabled={!outputText} style={{ marginLeft: 8 }}>
  Reverse to ASCII (.txt)
</button>
      <button onClick={downloadJson} disabled={!outputText} style={{ marginLeft: 8 }}>
        Save as JSON
        </button>
        <div style={{ marginTop: 16 }}>
  <label style={{ fontWeight: 'bold' }}>Upload ASCII text to convert to ASCII values:</label>
  <input type="file" accept=".txt" onChange={handleAsciiFile} style={{ marginLeft: 8 }} />
</div>
    </div>
  )
}
