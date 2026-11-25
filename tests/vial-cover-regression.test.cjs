const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('src/app.js','utf8');
const dist=fs.readFileSync('dist/app.js','utf8');
const css=fs.readFileSync('dist/style.css','utf8');
const editor=fs.readFileSync('dist/admin/campaign-editor.js','utf8');

test('calculadora mostra saldo do frasco depois do resultado e reaproveita SVG original',()=>{
 assert.equal(src,dist,'build não deve reintroduzir a calculadora anterior');
 const form=src.indexOf('function calculator(){');
 const done=src.indexOf('function calcSliderConfig(id)',form);
 const html=src.slice(form,done);
 assert.ok(html.indexOf('card calc-result')<html.indexOf('card calc-vial-overview'));
 assert.ok(src.includes("calcVial('balance')"));
 assert.ok(src.includes('[data-calc-fill="balance"]'));
 assert.ok(src.includes("fill.setAttribute('height',height)"));
 assert.match(css,/\.calc-vial-overview \.calc-vial-art \.calc-vial/);
 assert.match(css,/\[data-theme=light\] \.calc-vial-overview/);
});

test('cálculo funciona sem frasco físico e usa última dosagem salva por padrão',()=>{
 assert.ok(src.includes("Cálculo atual (automático)"));
 assert.ok(src.includes("const selected=saved.items[0]||null;"));
 assert.ok(src.includes("calcVialFormulaSelection=selected?.id||'';"));
 assert.ok(src.includes("const enteredMass=valid?Number($('#mass').value):0;"));
 assert.ok(src.includes("const vial=stored.items.find(item=>item.id===stored.active);"));
 assert.ok(src.includes("if(event.target.id==='calc-vial-select')"));
 assert.ok(src.includes("if(selected)applyCalcSaved(selected);"));
 assert.ok(src.includes("updateCalcVial();"));
 assert.ok(src.includes("Dosagem acompanhada<select id=\"calc-vial-select\""));
 assert.ok(src.includes("Frasco físico vinculado a aplicações (opcional)"));
});

test('capa de vídeo procura frame após início antes de gerar JPEG, com alternativa na falha',()=>{
 assert.ok(editor.includes("video.currentTime=offset"));
 assert.ok(editor.includes("await until('seeked',8000"));
 assert.ok(editor.includes("[.15,.38,.63].map(fraction"));
 assert.ok(editor.includes("canvas.toDataURL('image/jpeg',.82)"));
 assert.ok(editor.includes("Capa automática indisponível: escolher imagem alternativa"));
});
