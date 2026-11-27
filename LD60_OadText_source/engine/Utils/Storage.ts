// TODO

// wanted:
// let obj = new Storage("id", {points: 0}).link;

// TODO: fallback kann ähnlich definiert werden wie in tween, mit primitiven variablen oder "stringify parse" interface oder so.
// Aber woher weiß man zu welcher klasse man parsen muss ? Muss auf instanz .parse ausführen können und soll instanz überschreiben

// TODO unnötiges speichern verhindern (vllt prototype benutzen)

type JSONable<T> = { //TODO
	[P in keyof T]?: number | string | (JSONable<T[P]> & object);
};

export default class Storage {
	private static ids: Set<string> = new Set();

	//private static storage: object = {};
	//private static initialized: boolean = false;

	public link: object;

	constructor(id: string, fallback: object) {
		if (Storage.ids.has(id)) {
			throw new Error('Id ' + id + ' already used for another storage.');
		}
		Storage.ids.add(id);

		const test = localStorage.getItem(id);
		// TODO use zod
		this.link = test ? JSON.parse(test) as any : fallback;

		window.addEventListener('beforeunload', () => {
			//	if(Object.keys(Storage.storage).length > 0) {
			localStorage.setItem(id, JSON.stringify(this.link));
			//	};
		});
	}
}

/*app.module(function(app, {id}) {

	window.addEventListener('beforeunload', function() {
		if(Object.keys(app.storage) > 0) {
			localStorage.setItem(id, JSON.stringify(app.storage));
		};
	});

	if(localStorage) {
		app.storage = JSON.parse(localStorage.getItem(id)) || {};
	};

});*/
