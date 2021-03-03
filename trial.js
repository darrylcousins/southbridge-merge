const fs = require("fs");

const map = {};
fs.readFile('streamside-products.json', (err, data) => {
  if (err) throw err;
  let streamside = JSON.parse(data);
  fs.readFile('southbridge-products.json', (err, data) => {
    if (err) throw err;
    let southbridge = JSON.parse(data);
    streamside.forEach(el => {
      const title = el.title.replace(/^- ?/, '');
      const find = southbridge.filter(p => p.title === title);
      if (!find.length) {
        console.log(el.title, title);
      } else if (find.length > 1) {
        console.log(title, 'More than one');
      } else {
        //map[el.variant_id] = find[0].variant_id;
        map[el.id] = find[0].id;
      }
    });
    console.log(map, Object.keys(map).length);
    fs.writeFile('product_id_map.json', JSON.stringify(map, null, 2), (err) => console.log(err));
  });
});
