/**
 * Shared step renderer for the walkthrough UI.
 */

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderBitfields(v) {
  const fields = [
    { key: 'sign', label: 'Sign', bits: v.sign, flex: 1 },
    { key: 'combination', label: 'Combination', bits: v.combination, flex: 5 },
    { key: 'expCont', label: 'Exp cont.', bits: v.expCont, flex: 6 },
    {
      key: 'coeffCont',
      label: 'Coeff. continuation',
      bits: v.coeffCont ?? `${v.declet0 ?? ''}${v.declet1 ?? ''}`,
      flex: 20,
      split: v.declet0 && v.declet1 ? [v.declet0, v.declet1] : null,
    },
  ];

  const cells = fields
    .map((f) => {
      const hot = Array.isArray(v.highlight)
        ? v.highlight.includes(f.key)
        : v.highlight === f.key;
      const hi = hot ? ' is-hot' : '';
      const body = f.split
        ? `<span class="bf-bits bf-split"><span>${esc(f.split[0])}</span><span>${esc(f.split[1])}</span></span>`
        : `<span class="bf-bits">${esc(f.bits)}</span>`;
      return `
        <div class="bf-field bf-${f.key}${hi}" style="flex:${f.flex}">
          ${body}
          <span class="bf-label">${esc(f.label)}</span>
        </div>`;
    })
    .join('');

  return `<div class="bit-strip" role="img" aria-label="decimal32 bit fields">${cells}</div>`;
}

export function renderDigits(v) {
  // Keep every digit from the step payload. Only pad when the step asks for a
  // 7-digit encoding view — never slice long significands down to 7 here.
  let digits = String(v.digits ?? '0');
  if (v.groupRest && digits.length < 7) {
    digits = digits.padStart(7, '0');
  }
  const showGroups = Boolean(v.groupRest && digits.length === 7);
  const chips = [...digits]
    .map((d, i) => {
      let cls = 'digit-chip';
      if (v.markMsd && i === 0) cls += ' is-msd';
      else if (showGroups && i >= 1 && i <= 3) cls += ' is-g0';
      else if (showGroups && i >= 4) cls += ' is-g1';
      return `<span class="${cls}">${esc(d)}</span>`;
    })
    .join('');

  const sign = v.sign === 1 ? '−' : '';
  const exp =
    typeof v.exponent === 'number'
      ? `<span class="digit-exp">× 10<sup>${esc(String(v.exponent))}</sup></span>`
      : '';
  const legend = showGroups
    ? `<div class="digit-legend">
         <span><i class="swatch swatch-msd"></i>MSD → combination</span>
         <span><i class="swatch swatch-g0"></i>group → declet 0</span>
         <span><i class="swatch swatch-g1"></i>group → declet 1</span>
       </div>`
    : digits.length > 7
      ? `<div class="digit-legend"><span>${digits.length} digits before rounding to 7</span></div>`
      : '';

  return `
    <div class="digit-viz">
      <div class="digit-row">
        <span class="digit-sign">${sign}</span>
        ${chips}
        ${exp}
      </div>
      ${legend}
    </div>`;
}

export function renderEquation(v) {
  return `
    <div class="eq-viz">
      <code class="eq-side">${esc(v.left)}</code>
      <span class="eq-arrow" aria-hidden="true">→</span>
      <code class="eq-side">${esc(v.right)}</code>
      ${v.note ? `<p class="eq-note">${esc(v.note)}</p>` : ''}
    </div>`;
}

export function renderParts(v) {
  const parts = (v.parts || [])
    .map(
      (p) => `
      <div class="part-chip tone-${esc(p.tone || 'neutral')}">
        <span class="part-label">${esc(p.label)}</span>
        <code class="part-value">${esc(p.value)}</code>
      </div>`
    )
    .join('');
  return `<div class="parts-viz">${parts}</div>`;
}

export function renderDpd(v) {
  return `
    <div class="dpd-viz">
      <div class="dpd-col">
        <span class="dpd-label">Digits</span>
        <code class="dpd-box tone-g0">${esc(v.group0)}</code>
        <code class="dpd-box tone-g1">${esc(v.group1)}</code>
      </div>
      <div class="dpd-arrows" aria-hidden="true">
        <span>→</span><span>→</span>
      </div>
      <div class="dpd-col">
        <span class="dpd-label">10-bit declets</span>
        <code class="dpd-box tone-d0">${esc(v.declet0)}</code>
        <code class="dpd-box tone-d1">${esc(v.declet1)}</code>
      </div>
    </div>`;
}

export function renderHex(v) {
  const bits = String(v.bits || '').replace(/\s/g, '').padStart(32, '0').slice(-32);
  const nibbles = v.nibbles || [];
  const hexDigits = String(v.hexDigits || v.hex || '').replace(/^0x/i, '');
  const cells = nibbles
    .map((nibble, i) => {
      const digit = hexDigits[i] ?? '';
      return `
        <div class="hex-cell">
          <code class="hex-nibble">${esc(nibble)}</code>
          <span class="hex-arrow" aria-hidden="true">↓</span>
          <code class="hex-digit">${esc(digit)}</code>
        </div>`;
    })
    .join('');
  return `
    <div class="hex-viz">
      <div class="hex-row">${cells}</div>
      <p class="hex-result">Hexadecimal result: <code>${esc(v.hex || '0x' + hexDigits)}</code></p>
    </div>`;
}

export function renderColumns(v) {
  const rows = Array.isArray(v.rows) ? v.rows : [];
  const allDigitStrings = rows
    .map((r) => String(r.digits ?? '0'))
    .concat(v.result ? [String(v.result.digits ?? '0')] : []);
  const width = Math.max(1, ...allDigitStrings.map((d) => d.length));

  const renderRow = (r, isResult) => {
    const digits = String(r.digits ?? '0').padStart(width, '0');
    const signChar = r.sign === 1 ? '−' : r.sign === 0 ? '+' : '';
    const chips = [...digits]
      .map((d) => `<span class="col-chip">${esc(d)}</span>`)
      .join('');
    const expTag =
      typeof r.exponent === 'number'
        ? `<span class="col-exp">× 10<sup>${esc(String(r.exponent))}</sup></span>`
        : '';
    return `
      <div class="col-row${isResult ? ' is-result' : ''}">
        <span class="col-label">${esc(r.label ?? '')}</span>
        <span class="col-sign${signChar === '−' ? ' is-neg' : ''}">${signChar}</span>
        <span class="col-digits">${chips}</span>
        ${expTag}
      </div>`;
  };

  const rowsHtml = rows.map((r) => renderRow(r, false)).join('');
  const resultHtml = v.result
    ? `<div class="col-rule" aria-hidden="true"></div>${renderRow(v.result, true)}`
    : '';

  return `
    <div class="columns-viz">
      ${rowsHtml}
      ${resultHtml}
      ${v.note ? `<p class="col-note">${esc(v.note)}</p>` : ''}
    </div>`;
}

export function renderVisual(visual) {
  if (!visual) return '';
  switch (visual.type) {
    case 'bitfields':
      return renderBitfields(visual);
    case 'digits':
      return renderDigits(visual);
    case 'equation':
      return renderEquation(visual);
    case 'parts':
      return renderParts(visual);
    case 'dpd':
      return renderDpd(visual);
    case 'hex':
      return renderHex(visual);
    case 'columns':
      return renderColumns(visual);
    default:
      return '';
  }
}

export function overviewFromBits(bits) {
  const b = String(bits || '').replace(/\s/g, '').padStart(32, '0').slice(-32);
  return renderBitfields({
    type: 'bitfields',
    sign: b.slice(0, 1),
    combination: b.slice(1, 6),
    expCont: b.slice(6, 12),
    declet0: b.slice(12, 22),
    declet1: b.slice(22, 32),
  });
}

export function renderStep(s, i) {
  if (typeof s === 'string') {
    return `<li class="step-card" style="--i:${i}"><p class="step-text">${esc(s)}</p></li>`;
  }
  return `
    <li class="step-card" style="--i:${i}">
      <h3 class="step-title"><span class="step-num">${i + 1}</span>${esc(s.title || 'Step')}</h3>
      <p class="step-text">${esc(s.text || '')}</p>
      ${renderVisual(s.visual)}
    </li>`;
}

export function renderStepList(steps) {
  return `<ol class="step-list">${(steps || []).map(renderStep).join('')}</ol>`;
}
