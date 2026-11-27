import type { PixiElements } from '@pixi/react';
import { type Container } from 'pixi.js';
import { useLayoutEffect, useRef } from 'react';

const elementOfInstance = new WeakMap<Container, Container>();
const instancesOfElement = new WeakMap<Container, Set<Container>>();

function addElementToTreeIfOneInstance(element: Container, instances: Set<Container>) {
	if (instances.size == 1) {
		instances.forEach(i => i.addChild(element));
	}
}

function removeElementFromTreeIfOneInstance(element: Container, instances: Set<Container>) {
	if (instances.size == 1) {
		instances.forEach(i => i.removeChild(element));
	}
}

function addElementToInstance(instance: Container, element: Container) {
	elementOfInstance.set(instance, element);

	if (!instancesOfElement.has(element)) {
		instancesOfElement.set(element, new Set());
	}
	const instances = instancesOfElement.get(element)!;
	removeElementFromTreeIfOneInstance(element, instances);
	instances.add(instance);
	addElementToTreeIfOneInstance(element, instances);
}

function removeElementFromInstance(instance: Container, element: Container) {
	elementOfInstance.delete(instance);

	const instances = instancesOfElement.get(element)!;
	removeElementFromTreeIfOneInstance(element, instances);
	instances.delete(instance);
	addElementToTreeIfOneInstance(element, instances);
	if (instances.size == 0) {
		instancesOfElement.delete(element);
	}
}

/**
 * Renders a container holding the provided element. This is only meant as a
 * fallback option.
 *
 * Props will be applied to the container, not the element itself.
 *
 * Note: The element will only be rendered if it is used exactly once.
 */
export default function Use(props: Omit<PixiElements['pixiSprite'], 'children'> & {
	element: Container;
}) {
	const ref = useRef<Container>(null);

	const {
		element,
		...rest
	} = props;

	useLayoutEffect(() => {
		addElementToInstance(ref.current!, element);

		return () => {
			removeElementFromInstance(ref.current!, element);
		};
	}, [element]);

	return <pixiContainer ref={ref} {...rest} />;
}
