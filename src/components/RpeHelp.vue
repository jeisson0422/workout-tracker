<script setup lang="ts">
// Botón "!" que abre una explicación de cómo calcular el RPE (esfuerzo percibido, escala 1-10).
import { swalInstance, getSwalSettings } from '../services/swalHelper'

const ROWS: { rpe: string; reserve: string; feel: string }[] = [
  { rpe: '10', reserve: '0', feel: 'Máximo absoluto' },
  { rpe: '9.5', reserve: '0', feel: 'Ninguna más, pero con margen para subir peso' },
  { rpe: '9', reserve: '1', feel: 'Una más, con esfuerzo' },
  { rpe: '8.5', reserve: '1-2', feel: 'Una o dos más' },
  { rpe: '8', reserve: '2', feel: 'Pesado pero controlado' },
  { rpe: '7', reserve: '3', feel: 'Rápido y firme' },
  { rpe: '5-6', reserve: '4-6', feel: 'Ligero, como calentamiento' }
]

function open() {
  const rows = ROWS.map(r => `
    <tr>
      <td style="padding:6px 8px;font-weight:700;white-space:nowrap">${r.rpe}</td>
      <td style="padding:6px 8px;white-space:nowrap;text-align:center">${r.reserve}</td>
      <td style="padding:6px 8px;opacity:.85">${r.feel}</td>
    </tr>`).join('')

  swalInstance.fire({
    ...getSwalSettings(),
    title: '¿Cómo calcular el RPE?',
    html: `
      <div style="text-align:left;line-height:1.5;font-size:15px">
        <p style="margin:0 0 10px">Al terminar la serie, pregúntate: <b>¿cuántas repeticiones más habría hecho con buena técnica?</b> El RPE es 10 menos ese número.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <thead>
            <tr style="opacity:.7;font-size:12px">
              <th style="padding:4px 8px;text-align:left;white-space:nowrap">RPE</th>
              <th style="padding:4px 8px;white-space:nowrap">Reps extra</th>
              <th style="padding:4px 8px;text-align:left;white-space:nowrap">Se siente</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:12px 0 0;font-size:13px;opacity:.85">Anota el de tu serie más dura. Si dudas entre dos valores, elige el más alto. Una repetición con mala técnica no cuenta como extra.</p>
      </div>`,
    confirmButtonText: 'Entendido',
    showCancelButton: false
  })
}
</script>

<template>
  <button type="button" class="rpe-help" aria-label="Cómo calcular el RPE" @click="open">!</button>
</template>

<style scoped>
.rpe-help {
  position: relative;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid var(--border2);
  background: var(--bg3);
  color: var(--text2);
  font: 700 11px/1 'Hanken Grotesk', sans-serif;
  cursor: pointer;
  transition: transform 160ms ease-out, color 160ms ease-out, border-color 160ms ease-out;
}
/* Amplía el área táctil sin agrandar el botón. */
.rpe-help::after { content: ''; position: absolute; inset: -13px; }
.rpe-help:active { transform: scale(0.95); }
@media (hover: hover) {
  .rpe-help:hover { color: var(--accent); border-color: var(--accent); }
}
.rpe-help:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .rpe-help { transition: none; }
}
</style>
