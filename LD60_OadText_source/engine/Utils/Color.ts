import type Interpolative from './Interpolative';

export default class Color implements Interpolative {
	private _red = 0;
	private _green = 0;
	private _blue = 0;

	private _hue = 0;
	private _saturation = 0;
	private _value = 0;

	private RGBdirty = false;
	private HSVdirty = false;

	private test = 'Hoffentlich erscheint das nie in der Console'; //TODO Checken ob test kommt wenn man propertyies vom Object aufruft

	public static fromRGB(red: number, green: number, blue: number) {
		const color = new Color();
		color.red = red;
		color.green = green;
		color.blue = blue;
		color.HSVdirty = true;
		return color;
	}
	public static fromHSV(hue: number, saturation: number, value: number) {
		const color = new Color();
		color.hue = hue;
		color.saturation = saturation;
		color.value = value;
		color.RGBdirty = true;
		return color;
	}
	public static fromString(colorCode: string) {
		const reg = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(colorCode);
		if (reg !== null) {
			const hexCode = reg[1];
			if (hexCode.length === 3) {
				//TODO color mit 3 digits wird falsch interpretiert
			}
			return Color.fromNumber(parseInt(hexCode, 16));
		}
		//TODO zb vordefinierte werte wie red,green..., sonst error werfen
		throw new Error('Invalid string to initiate Color');
	}
	public static fromNumber(value: number) {
		return Color.fromRGB(
			value >> 16,
			value >> 8 & 255,
			value & 255,
		);
	}
	public static fromColor(color: Color) { //wenn man HSL verwendet vllt unexakt
		if (color.RGBdirty) color.updateRGB();
		const copy = new Color();
		copy._red = color._red;
		copy._green = color._green;
		copy._blue = color._blue;
		return copy;
	}

	set red(value) {
		if (this.RGBdirty) this.updateRGB();
		if (value > 255) {
			value = 255;
		}
		if (value < 0) {
			value = 0;
		}
		this._red = value;
		this.HSVdirty = true;
	}
	get red() {
		if (this.RGBdirty) this.updateRGB();
		return Math.floor(this._red);
	}
	set green(value) {
		if (this.RGBdirty) this.updateRGB();
		if (value > 255) {
			value = 255;
		}
		if (value < 0) {
			value = 0;
		}
		this._green = value;
		this.HSVdirty = true;
	}
	get green() {
		if (this.RGBdirty) this.updateRGB();
		return Math.floor(this._green);
	}
	set blue(value) {
		if (this.RGBdirty) this.updateRGB();
		if (value > 255) {
			value = 255;
		}
		if (value < 0) {
			value = 0;
		}
		this._blue = value;
		this.HSVdirty = true;
	}
	get blue() {
		if (this.RGBdirty) this.updateRGB();
		return Math.floor(this._blue);
	}

	set hue(value) {
		if (this.HSVdirty) this.updateHSV();
		value = Math.floor(value) % 360;
		if (value < 0) {
			value += 360;
		}
		this._hue = value;
		this.RGBdirty = true;
	}
	get hue() {
		if (this.HSVdirty) this.updateHSV();
		return Math.floor(this._hue);
	}
	set saturation(value) {
		if (this.HSVdirty) this.updateHSV();
		value /= 100;
		if (value > 1) {
			value = 1;
		}
		if (value < 0) {
			value = 0;
		}
		this._saturation = value;
		this.RGBdirty = true;
	}
	get saturation() {
		if (this.HSVdirty) this.updateHSV();
		return Math.floor(this._saturation * 100);
	}
	set value(value) {
		if (this.HSVdirty) this.updateHSV();
		value /= 100;
		if (value > 1) {
			value = 1;
		}
		if (value < 0) {
			value = 0;
		}
		this._value = value;
		this.RGBdirty = true;
	}
	get value() {
		if (this.HSVdirty) this.updateHSV();
		return Math.floor(this._value * 100);
	}

	private updateHSV() {
		const cMax = Math.max(this._red, this._green, this._blue) / 255;
		const cMin = Math.min(this._red, this._green, this._blue) / 255;
		const delta = cMax - cMin;

		if (delta === 0) {
			this._hue = 0;
		} else if (cMax === this._red / 255) {
			this._hue = 60 * ((this._green - this._blue) / 255 / delta % 6);
		} else if (cMax === this._green / 255) {
			this._hue = 60 * ((this._blue - this._red) / 255 / delta + 2);
		} else if (cMax === this._blue / 255) {
			this._hue = 60 * ((this._red - this._green) / 255 / delta + 4);
		}
		this._saturation = cMax === 0 ? 0 : delta / cMax;
		this._value = cMax;

		this.HSVdirty = false;
	}

	private updateRGB() {
		const c = this._value * this._saturation;
		const x = c * (1 - Math.abs((this._hue / 60) % 2 - 1));
		const m = this._value - c;
		let r, g, b;

		if (this._hue < 60) {
			[r, g, b] = [c, x, 0];
		} else if (this._hue < 120) {
			[r, g, b] = [x, c, 0];
		} else if (this._hue < 180) {
			[r, g, b] = [0, c, x];
		} else if (this._hue < 240) {
			[r, g, b] = [0, x, c];
		} else if (this._hue < 300) {
			[r, g, b] = [x, 0, c];
		} else {
			[r, g, b] = [0, 0, x];
		}
		this._red = (r + m) * 255;
		this._green = (g + m) * 255;
		this._blue = (b + m) * 255;

		this.RGBdirty = false;
	}

	toString() {
		let hexcode = this.valueOf().toString(16).toUpperCase();
		while (hexcode.length < 6) {
			hexcode = '0' + hexcode;
		}
		return '#' + hexcode;
	}
	valueOf() {
		return (this.red << 16) + (this.green << 8) + this.blue;
	}

	copy() {
		return Color.fromColor(this);
	}
	lerp(from: Color, to: Color, time: number) { //sollte auch nur objekte mit propoerties red, green... erlauben/nein, die sollten dann in den Konstruktor geschickt werden
		//TODO bessere methoden anbieten, siehe http://www.alanzucconi.com/2016/01/06/colour-interpolation/
		this.red = from.red + (to.red - from.red) * time;
		this.green = from.green + (to.green - from.green) * time;
		this.blue = from.blue + (to.blue - from.blue) * time;
	}
}

/*class Color2 implements Interpolative {
	constructor() {

	}
	copy(): Interpolative {
		return new Color2();//das soll eig fehler bringen
	}
	lerp(from: Interpolative, to: Interpolative, time: number): void {
		throw new Error("Method not implemented.");
	}

}*/
