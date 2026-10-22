const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/vietnam_map_data.json'), 'utf8'));
const colors = ['#0f3863', '#124173', '#0d3259', '#14467c', '#103d6a'];

const parts = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 750" width="900" height="750" style="background:#060d19">',
  '<g id="neighbors">',
  ...data.neighbors.map(n => `<path d="${n.d}" fill="#0c182a" stroke="#162a45" stroke-width="0.8"/>`),
  '</g>',
  '<g id="provinces">',
  ...data.provinces.map((p, i) => `<path d="${p.d}" fill="${colors[i % colors.length]}" stroke="#1d5685" stroke-width="0.6"><title>${p.name}${p.note ? ' - ' + p.note : ''}</title></path>`),
  '</g>',
  '</svg>'
];

fs.writeFileSync(path.join(__dirname, '../public/test_map.svg'), parts.join(''));
console.log('Saved test_map.svg successfully!');
