const fs = require('fs');
let data = fs.readFileSync('src/utils/seedData.js', 'utf8');
data = data.replace(/rate: ([\d\.]+)/g, (match, p1) => {
  const previous = (parseFloat(p1) - 1.5 - Math.random() * 2).toFixed(2);
  return `${match},\n    previousRate: ${previous}`;
});
fs.writeFileSync('src/utils/seedData.js', data);
