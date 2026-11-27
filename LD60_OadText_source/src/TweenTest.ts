import Tween from 'engine/Utils/Tween';
import Color from 'engine/Utils/Color';

let obj = {
	b: 5,
	c: {
		a: 5,
		b: 6,
	},
	d: 'IHIIH',
	e: Color.fromRGB(2, 2, 2),
};

new Tween(obj, { b: 1, e: Color.fromRGB(2, 7, 9) }, 36 / 60);

//new Tween(obj, { d: "hi" }, 36 / 60);

//das wäre noch schön, und es geht!
new Tween(obj, { c: { a: 3 } }, 36 / 60);

new Tween(obj, {
	b: 1,
	e: Color.fromRGB(2, 7, 9),
	c: { a: 5, b: 8 },
}, 36 / 60); //ist das übrehaupt so schon korrekt implementiert?

new Tween(obj.e, Color.fromRGB(2, 2, 2), 100);
