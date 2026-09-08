export default function Field({ field, value, onChange }) {
  const [key, label, kind = 'text', options, inputProps = {}] = field
  if (kind === 'textarea') return <label className="wide">{label}<textarea rows="3" value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>
  if (kind === 'select') return <label>{label}<select value={value ?? ''} onChange={(event) => onChange(key, event.target.value)}><option value="">選択しない</option>{value && !options.includes(value) && <option value={value}>{value}（保存済み）</option>}{options.map((option) => <option key={option}>{option}</option>)}</select></label>
  return <label>{label}<input type={kind} {...inputProps} value={value ?? ''} onChange={(event) => onChange(key, event.target.value)} /></label>
}
