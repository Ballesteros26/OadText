import ts from 'typescript';

/**
 * ```
 * import { hotClass as name } from 'engine/Runtime/__internal/hot';
 * ```
 */
function importHotClassDecorator(
	name: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return factory.createImportDeclaration(
		undefined,
		factory.createImportClause(
			false,
			undefined,
			factory.createNamedImports([factory.createImportSpecifier(
				false,
				factory.createIdentifier('hotClass'),
				name,
			)]),
		),
		factory.createStringLiteral('engine/Runtime/__internal/hot'),
		undefined,
	);
}

/**
 * ```
 * const name = {};
 * ```
 */
function createEmptyObject(
	name: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return factory.createVariableStatement(
		undefined,
		factory.createVariableDeclarationList(
			[factory.createVariableDeclaration(
				name,
				undefined,
				undefined,
				factory.createObjectLiteralExpression(
					[],
					false,
				),
			)],
			ts.NodeFlags.Const,
		),
	);
}

/**
 * ```
 * if(import.meta.hot) {
 *     acceptHandler;
 *     import.meta.hot.dispose(data => {
 *         data.hotClassesCache = classesCache;
 *     });
 * }
 * ```
 */
function hotHandler(
	acceptHandler: ts.Statement,
	classesCacheName: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return factory.createIfStatement(
		factory.createPropertyAccessExpression(
			factory.createMetaProperty(
				ts.SyntaxKind.ImportKeyword,
				factory.createIdentifier('meta'),
			),
			factory.createIdentifier('hot'),
		),
		factory.createBlock(
			[
				acceptHandler,
				factory.createExpressionStatement(factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createPropertyAccessExpression(
							factory.createMetaProperty(
								ts.SyntaxKind.ImportKeyword,
								factory.createIdentifier('meta'),
							),
							factory.createIdentifier('hot'),
						),
						factory.createIdentifier('dispose'),
					),
					undefined,
					[factory.createArrowFunction(
						undefined,
						undefined,
						[factory.createParameterDeclaration(
							undefined,
							undefined,
							factory.createIdentifier('data'),
							undefined,
							undefined,
							undefined,
						)],
						undefined,
						factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
						factory.createBlock(
							[factory.createExpressionStatement(factory.createBinaryExpression(
								factory.createPropertyAccessExpression(
									factory.createIdentifier('data'),
									factory.createIdentifier('hotClassesCache'),
								),
								factory.createToken(ts.SyntaxKind.EqualsToken),
								classesCacheName,
							))],
							true,
						),
					)],
				)),
			],
			true,
		),
		undefined,
	);
}

/**
 * ```
 * if(import.meta.hot) {
 *     import.meta.hot.accept();
 *     import.meta.hot.dispose(data => {
 *         data.hotClassesCache = classesCache;
 *     });
 * }
 * ```
 */
function createHotHandler(
	classesCacheName: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return hotHandler(
		factory.createExpressionStatement(factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createPropertyAccessExpression(
					factory.createMetaProperty(
						ts.SyntaxKind.ImportKeyword,
						factory.createIdentifier('meta'),
					),
					factory.createIdentifier('hot'),
				),
				factory.createIdentifier('accept'),
			),
			undefined,
			[],
		)),
		classesCacheName,
		factory,
	);
}

/**
 * ```
 * if(import.meta.hot) {
 *   import.meta.hot.acceptExports(exportNames);
 *   import.meta.hot.dispose(data => {
 *     data.hotClassesCache = classesCache;
 *   });
 * }
 * ```
 */
function createPartialHotHandler(
	exportNames: string[],
	classesCacheName: ts.Identifier,
	factory: ts.NodeFactory,
) {
	const arrayLiteral = factory
		.createArrayLiteralExpression(exportNames.map(name => factory.createStringLiteral(name)));
	return hotHandler(
		factory.createExpressionStatement(factory.createCallExpression(
			factory.createPropertyAccessExpression(
				factory.createPropertyAccessExpression(
					factory.createMetaProperty(
						ts.SyntaxKind.ImportKeyword,
						factory.createIdentifier('meta'),
					),
					factory.createIdentifier('hot'),
				),
				factory.createIdentifier('acceptExports'),
			),
			undefined,
			[arrayLiteral],
		)),
		classesCacheName,
		factory,
	);
}

/**
 * ```
 * \@hotClassName(className, classDefaultExport, import.meta.hot?.data?.hotClassesCache, classesCacheName)
 * ```
 */
function createHotClassDecorator(
	hotClassName: ts.Identifier,
	className: ts.StringLiteral | undefined,
	classDefaultExport: boolean,
	classesCacheName: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return factory.createDecorator(factory.createCallExpression(
		hotClassName,
		undefined,
		[
			className != null ? className : factory.createIdentifier('undefined'),
			classDefaultExport ? factory.createTrue() : factory.createFalse(),
			factory.createPropertyAccessChain(
				factory.createPropertyAccessChain(
					factory.createPropertyAccessExpression(
						factory.createMetaProperty(
							ts.SyntaxKind.ImportKeyword,
							factory.createIdentifier('meta'),
						),
						factory.createIdentifier('hot'),
					),
					factory.createToken(ts.SyntaxKind.QuestionDotToken),
					factory.createIdentifier('data'),
				),
				factory.createToken(ts.SyntaxKind.QuestionDotToken),
				factory.createIdentifier('hotClassesCache'),
			),
			classesCacheName,
		],
	));
}

export default (partialAccept: boolean) => (context: ts.TransformationContext) => (node: ts.SourceFile) => {
	const classSet = new Set<string>();
	const exportToClassMap = new Map<string, string>();

	const hotClassName = context.factory.createUniqueName('hotClass');
	const classesCacheName = context.factory.createUniqueName('classesCache');

	node = ts.visitEachChild(
		node,
		(node) => visitor(classSet, exportToClassMap, hotClassName, classesCacheName, context.factory, node),
		context,
	);

	// keep HMR logic for not exported class declarations
	if (partialAccept && classSet.size === 0) {
		return node;
	}

	const exportNames = partialAccept
		? [...exportToClassMap.entries()]
			.filter(([_, className]) => classSet.has(className))
			.map(([exportName, _]) => exportName)
		: [];

	return context.factory.updateSourceFile(node, [
		importHotClassDecorator(hotClassName, context.factory),
		createEmptyObject(classesCacheName, context.factory),
		...node.statements,
		partialAccept
			? createPartialHotHandler(exportNames, classesCacheName, context.factory)
			: createHotHandler(classesCacheName, context.factory),
	]);
};

function applyToExportToClassMap(
	exportToClassMap: Map<string, string>,
	node: ts.ExportDeclaration,
) {
	node.exportClause?.forEachChild(clause => {
		if (ts.isExportSpecifier(clause)) {
			exportToClassMap.set(
				clause.name.escapedText.toString(),
				(clause.propertyName?.escapedText ?? clause.name.escapedText).toString(),
			);
		}
	});
}

function visitor(
	classSet: Set<string>,
	exportToClassMap: Map<string, string>,
	hotClassName: ts.Identifier,
	classesCacheName: ts.Identifier,
	factory: ts.NodeFactory,
	node: ts.Node,
) {
	if (ts.isExportDeclaration(node)) {
		applyToExportToClassMap(exportToClassMap, node);
		return node;
	}

	if (!ts.isClassDeclaration(node)) {
		return node;
	}

	const className = node.name?.escapedText && factory.createStringLiteral(node.name?.escapedText);

	const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
	const classDefaultExport = node.modifiers?.some(m => m.kind === ts.SyntaxKind.DefaultKeyword) ?? false;

	const name = node.name?.escapedText ?? 'default';
	classSet.add(name);
	if (classDefaultExport) {
		exportToClassMap.set('default', name);
	} else if (isExported) {
		exportToClassMap.set(name, name);
	}

	return factory.updateClassDeclaration(
		node,
		[
			createHotClassDecorator(
				hotClassName,
				className,
				classDefaultExport,
				classesCacheName,
				factory,
			),
			...(node.modifiers ?? []),
		],
		node.name,
		node.typeParameters,
		node.heritageClauses,
		node.members,
	);
}
