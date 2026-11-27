type CacheEntry = {
	derivatives: WeakRef<object>[];
	currentClass: { new (...args: any[]): {} };
};

type Cache = Partial<Record<string | 0, CacheEntry>>;

export function hotClass(name: string | undefined, defaultExport: boolean, prevCache: Cache | undefined, cache: Cache) {
	return function(constructor: { new (...args: any[]): {} }) {
		class Hot extends constructor {
			static [Symbol.hasInstance](instance) {
				if (instance == null) {
					return false;
				}
				while (instance = Object.getPrototypeOf(instance)) {
					if (instance == entry.currentClass.prototype) {
						return true;
					}
				}
				return false;
			}
		}

		const prevEntry = getEntry(name, defaultExport, prevCache);
		if (prevEntry) {
			updateEntry(prevEntry, constructor);
			prevEntry.derivatives.push(new WeakRef(Hot));
		}

		const entry = prevEntry ?? {
			derivatives: [new WeakRef(Hot)],
			currentClass: constructor,
		};
		setEntry(name, defaultExport, cache, entry);

		return Hot;
	};
}

function setEntry(name: string | undefined, defaultExport: boolean, cache: Cache, entry: CacheEntry) {
	if (name) {
		cache[name] = entry;
	}
	if (defaultExport) {
		cache[0] = entry;
	}
}

function getEntry(name: string | undefined, defaultExport: boolean, cache: Cache | undefined) {
	if (cache === undefined) {
		return undefined;
	}
	if (name != null && cache[name] != null) {
		return cache[name];
	} else if (defaultExport && cache[0] != null) {
		return cache[0];
	}
	return undefined;
}

function updateEntry(entry: CacheEntry, currentClass: { new (...args: any[]): {} }) {
	entry.currentClass = currentClass;

	entry.derivatives.forEach((element: WeakRef<any>) => {
		const instance = element.deref();
		if (instance) {
			Object.setPrototypeOf(instance.prototype, currentClass.prototype);
		}
	});
}
