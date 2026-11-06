/**
 * Compila src/app.jsx (React con JSX) a JavaScript normal y lo pone dentro de index.html.
 * Así el navegador del candidato no tiene que descargar Babel (unos 3 MB) cada vez que abre.
 *
 * Uso:   npm install        (solo la primera vez)
 *        npm run compilar
 */
const fs = require('fs');
const path = require('path');
const Babel = require('@babel/standalone');

const raiz = path.join(__dirname, '..');
const rutaFuente = path.join(raiz, 'src', 'app.jsx');
const rutaHtml = path.join(raiz, 'index.html');

const INICIO = '<!-- ===== CÓDIGO DE LA APP (generado desde src/app.jsx con "npm run compilar": NO EDITAR AQUÍ) ===== -->';
const FIN = '<!-- ===== FIN DEL CÓDIGO DE LA APP ===== -->';

const fuente = fs.readFileSync(rutaFuente, 'utf8');
const { code } = Babel.transform(fuente, {
  filename: 'app.jsx',
  presets: [
    ['react', { runtime: 'classic' }],
    // Navegadores mínimos: iPhone con iOS 14 y Chrome/Android de 2019 en adelante
    ['env', { targets: { safari: '14', ios: '14', chrome: '76', firefox: '69', edge: '79' }, modules: false }],
  ],
  comments: true,
});
if (/regeneratorRuntime|require\(/.test(code)) {
  throw new Error('El código compilado necesita ayudas externas (regeneratorRuntime/require). Revisa los navegadores mínimos.');
}

const bloque = `${INICIO}\n<script>\n${code.replace(/<\/script/gi, '<\\/script')}\n</script>\n${FIN}`;
let html = fs.readFileSync(rutaHtml, 'utf8');
if (html.includes('<!--CODIGO-APP-->')) {
  html = html.replace('<!--CODIGO-APP-->', () => bloque);
} else {
  const a = html.indexOf(INICIO);
  const b = html.indexOf(FIN);
  if (a < 0 || b < 0) throw new Error('No encontré las marcas del código de la app en index.html.');
  html = html.slice(0, a) + bloque + html.slice(b + FIN.length);
}
fs.writeFileSync(rutaHtml, html);
console.log(`Listo: index.html actualizado (${(code.length / 1024).toFixed(0)} KB de código de la app).`);
