import { fromError, type StackFrame } from 'stacktrace-js';

export default async function createStackBox(error: Error) {
	const stack = await fromError(error);

	setMaxLength(stack, 12);
	removeRecurringFrames(stack);

	stack.forEach(frame => {
		frame.fileName = removePrefix(frame.fileName);
	});

	const stackBox = document.createElement('div');

	{
		const s = stackBox.style;
		s.fontSize = '11px';
		s.fontFamily = 'monospace';
		s.display = 'inline-grid';
		s.gridTemplateColumns = 'auto auto';
		s.marginTop = '4em';
		s.columnGap = '2em';
	}

	stack.forEach((frame) => {
		const functionNameBox = document.createElement('div');
		const sourceBox = document.createElement('div');

		functionNameBox.innerText = frame.functionName ?? '';
		sourceBox.innerText = `${frame.fileName}:${frame.lineNumber}`;

		if (!frame.fileName?.startsWith('src/')) {
			functionNameBox.style.color = '#a0a0a0';
			sourceBox.style.color = '#a0a0a0';
		}
		if (__DEV__) {
			sourceBox.onclick = () =>
				import.meta.hot?.send(
					'dev-hooks:open-file',
					`./${frame.fileName}:${frame.lineNumber}:${frame.columnNumber}`,
				);
			sourceBox.style.cursor = 'pointer';
		}

		stackBox.appendChild(functionNameBox);
		stackBox.appendChild(sourceBox);
	});

	return stackBox;
}

function setMaxLength(array: any[], maxLength: number) {
	array.length = Math.min(maxLength, array.length);
}

function removeRecurringFrames(stack: StackFrame[]) {
	const stackSet = new Set();
	for (let i = 0; i < stack.length; i++) {
		const frame = stack[i];
		const key = `${frame.fileName}:${frame.lineNumber}:${frame.columnNumber}`;
		if (stackSet.has(key)) {
			stack.length = i;
			break;
		}
		stackSet.add(key);
	}
}

const prefix = `${window.location.origin}/`;
function removePrefix(fileName?: string) {
	if (fileName?.startsWith(prefix)) {
		return fileName.slice(prefix.length);
	}
	return fileName;
}
