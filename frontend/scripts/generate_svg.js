const fs = require('fs');
const data = require('../public/vietnam_map_data.json');

const colors = ['#0f3863', '#124173', '#0d3259', '#14467c'];
const parts = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 750" width="900" height="750" style="background:#060d19">`,
  `<g class="neighbors">`,
  ...data.neighbors.map(n => `<path d="${n.d}" fill="#0c182a" stroke="#162a45" stroke-width="0.8"/>`),
  `</g>`,
  `<g class="provinces">`,
  ...data.provinces.map((p, i) => `<path d="${p.d}" fill="${colors[i % colors.length]}" stroke="#1d5685" stroke-width="0.6"/>`),
  `</g>`,
  `</svg>`
];

fs.writeFileSync('public/test_map.svg', parts.join(''));
console.log('Saved public/test_map.svg, size KB:', fs.statSync('public/test_map.svg').size / 1024);
