import ts from 'typescript';

type Locker = ReturnType<typeof getLocker>;

function getLocker(context: ts.TransformationContext) {
	let isLockerUsed = false;
	const locker = context.factory.createUniqueName('locker');

	return {
		get isLockerUsed() {
			return isLockerUsed;
		},
		get getLocker() {
			isLockerUsed = true;
			return locker;
		},
	};
}

function addBodyBlockToArrowFunction(
	node: ts.ArrowFunction,
	factory: ts.NodeFactory,
) {
	if (ts.isBlock(node.body)) {
		return node;
	}
	return factory.updateArrowFunction(
		node,
		node.modifiers,
		node.typeParameters,
		node.parameters,
		node.type,
		node.equalsGreaterThanToken,
		factory.createBlock([
			factory.createReturnStatement(node.body),
		]),
	);
}

/**
 * Wraps the given block with
 *
 * ```
 * isInFinally = true;
 * try {
 *   // block
 * } catch (e) {
 *   throw e;
 * } finally {
 *   isInFinally = false;
 *   yield continueWithLastYieldToken;
 * }
 * ```
 */
function addLockCallsToFinallyBlock(
	node: ts.Block,
	locker: ts.Identifier,
	continueWithLastYieldToken: ts.Identifier,
	factory: ts.NodeFactory,
) {
	const errorIdentifier = factory.createIdentifier('e');
	return factory.updateBlock(
		node,
		[
			factory.createExpressionStatement(factory.createCallExpression(
				factory.createPropertyAccessExpression(
					locker,
					factory.createIdentifier('lock'),
				),
				undefined,
				[],
			)),
			factory.createTryStatement(
				node,
				factory.createCatchClause(
					factory.createVariableDeclaration(
						errorIdentifier,
						undefined,
						undefined,
						undefined,
					),
					factory.createBlock(
						[factory.createThrowStatement(errorIdentifier)],
						true,
					),
				),
				factory.createBlock(
					[
						factory.createExpressionStatement(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								locker,
								factory.createIdentifier('unlock'),
							),
							undefined,
							[],
						)),
						factory.createExpressionStatement(factory.createYieldExpression(
							undefined,
							continueWithLastYieldToken,
						)),
					],
					true,
				),
			),
		],
	);
}

function wrapBlockWithLockReturnCalls(
	node: ts.Block,
	locker: ts.Identifier,
	getLockReturnCalls: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return factory.createBlock(
		[factory.createReturnStatement(factory.createYieldExpression(
			factory.createToken(ts.SyntaxKind.AsteriskToken),
			factory.createCallExpression(
				getLockReturnCalls,
				undefined,
				[
					factory.createArrowFunction(
						undefined,
						undefined,
						[factory.createParameterDeclaration(
							undefined,
							undefined,
							locker,
							undefined,
							undefined,
							undefined,
						)],
						undefined,
						factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
						factory.createFunctionExpression(
							undefined,
							factory.createToken(ts.SyntaxKind.AsteriskToken),
							undefined,
							undefined,
							[],
							undefined,
							node,
						),
					),
					factory.createThis(),
				],
			),
		))],
		true,
	);
}

function wrapBlockWithrunAsync(
	node: ts.Block,
	runAsync: ts.Identifier,
	factory: ts.NodeFactory,
) {
	return factory.createBlock(
		[factory.createReturnStatement(factory.createCallExpression(
			runAsync,
			undefined,
			[
				factory.createFunctionExpression(
					undefined,
					factory.createToken(ts.SyntaxKind.AsteriskToken),
					undefined,
					undefined,
					[],
					undefined,
					node as ts.Block,
				),
				factory.createThis(),
			],
		))],
		true,
	);
}

/**
 * Applies (nearly) the same transformation as TypeScript does when targeting
 * ES2017 for for-await-of loops, so that await expressions can be replaced with
 * yield.
 */
function replaceForAwaitOfLoop(
	node: ts.ForOfStatement,
	asyncValues: ts.Identifier,
	factory: ts.NodeFactory,
) {
	const _a = factory.createUniqueName('_a');
	const e = factory.createUniqueName('e');
	const _b = factory.createUniqueName('_b');
	const _c = factory.createUniqueName('_c');
	const _d = factory.createUniqueName('_d');
	const _e = factory.createUniqueName('_e');
	const _f = factory.createUniqueName('_f');
	const e_ = factory.createUniqueName('e_');

	const initializer = node.initializer;
	const assignment = ts.isVariableDeclarationList(initializer)
		? factory.createVariableStatement(
			undefined,
			factory.updateVariableDeclarationList(
				initializer,
				initializer.declarations.map(d =>
					factory.updateVariableDeclaration(
						d,
						d.name,
						d.exclamationToken,
						d.type,
						_c,
					)
				),
			),
		)
		: factory.createExpressionStatement(factory.createBinaryExpression(
			initializer,
			factory.createToken(ts.SyntaxKind.EqualsToken),
			_c,
		));

	return factory.createTryStatement(
		factory.createBlock(
			[
				factory.createVariableStatement(
					undefined,
					factory.createVariableDeclarationList(
						[
							factory.createVariableDeclaration(
								_a,
								undefined,
								undefined,
								undefined,
							),
							factory.createVariableDeclaration(
								e,
								undefined,
								undefined,
								undefined,
							),
							factory.createVariableDeclaration(
								_b,
								undefined,
								undefined,
								undefined,
							),
							factory.createVariableDeclaration(
								_c,
								undefined,
								undefined,
								undefined,
							),
						],
						ts.NodeFlags.None,
					),
				),
				factory.createForStatement(
					factory.createVariableDeclarationList(
						[
							factory.createVariableDeclaration(
								_d,
								undefined,
								undefined,
								factory.createTrue(),
							),
							factory.createVariableDeclaration(
								_e,
								undefined,
								undefined,
								factory.createCallExpression(
									asyncValues,
									undefined,
									[node.expression],
								),
							),
							factory.createVariableDeclaration(
								_f,
								undefined,
								undefined,
								undefined,
							),
						],
						ts.NodeFlags.None,
					),
					factory.createBinaryExpression(
						factory.createBinaryExpression(
							factory.createBinaryExpression(
								_f,
								factory.createToken(ts.SyntaxKind.EqualsToken),
								factory.createAwaitExpression(factory.createCallExpression(
									factory.createPropertyAccessExpression(
										_e,
										factory.createIdentifier('next'),
									),
									undefined,
									[],
								)),
							),
							factory.createToken(ts.SyntaxKind.CommaToken),
							factory.createBinaryExpression(
								_a,
								factory.createToken(ts.SyntaxKind.EqualsToken),
								factory.createPropertyAccessExpression(
									_f,
									factory.createIdentifier('done'),
								),
							),
						),
						factory.createToken(ts.SyntaxKind.CommaToken),
						factory.createPrefixUnaryExpression(
							ts.SyntaxKind.ExclamationToken,
							_a,
						),
					),
					factory.createBinaryExpression(
						_d,
						factory.createToken(ts.SyntaxKind.EqualsToken),
						factory.createTrue(),
					),
					factory.createBlock(
						[
							factory.createExpressionStatement(factory.createBinaryExpression(
								_c,
								factory.createToken(ts.SyntaxKind.EqualsToken),
								factory.createPropertyAccessExpression(
									_f,
									factory.createIdentifier('value'),
								),
							)),
							factory.createExpressionStatement(factory.createBinaryExpression(
								_d,
								factory.createToken(ts.SyntaxKind.EqualsToken),
								factory.createFalse(),
							)),
							assignment,
							node.statement,
						],
						true,
					),
				),
			],
			true,
		),
		factory.createCatchClause(
			factory.createVariableDeclaration(
				e_,
				undefined,
				undefined,
				undefined,
			),
			factory.createBlock(
				[factory.createExpressionStatement(factory.createBinaryExpression(
					e,
					factory.createToken(ts.SyntaxKind.EqualsToken),
					factory.createObjectLiteralExpression(
						[factory.createPropertyAssignment(
							factory.createIdentifier('error'),
							e_,
						)],
						false,
					),
				))],
				false,
			),
		),
		factory.createBlock(
			[factory.createTryStatement(
				factory.createBlock(
					[factory.createIfStatement(
						factory.createBinaryExpression(
							factory.createBinaryExpression(
								factory.createPrefixUnaryExpression(
									ts.SyntaxKind.ExclamationToken,
									_d,
								),
								factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
								factory.createPrefixUnaryExpression(
									ts.SyntaxKind.ExclamationToken,
									_a,
								),
							),
							factory.createToken(ts.SyntaxKind.AmpersandAmpersandToken),
							factory.createParenthesizedExpression(factory.createBinaryExpression(
								_b,
								factory.createToken(ts.SyntaxKind.EqualsToken),
								factory.createPropertyAccessExpression(
									_e,
									factory.createIdentifier('return'),
								),
							)),
						),
						factory.createExpressionStatement(factory.createAwaitExpression(factory.createCallExpression(
							factory.createPropertyAccessExpression(
								_b,
								factory.createIdentifier('call'),
							),
							undefined,
							[_e],
						))),
						undefined,
					)],
					true,
				),
				undefined,
				factory.createBlock(
					[factory.createIfStatement(
						e,
						factory.createThrowStatement(factory.createPropertyAccessExpression(
							e,
							factory.createIdentifier('error'),
						)),
						undefined,
					)],
					false,
				),
			)],
			true,
		),
	);
}

const visitor = (
	imports: Imports,
	globalScope: boolean,
	parentIsAsyncFunction: boolean,
	upperLocker: Locker | null,
	awaitEncounteredCallback: (() => void) | null,
	context: ts.TransformationContext,
) =>
(node: ts.Node) => {
	let nodeIsAsyncFunction = false;

	// dont mutate upperLocker because it is shared between visitors
	let locker = upperLocker;
	// remove async keywords
	if (node.kind === ts.SyntaxKind.AsyncKeyword) {
		return undefined;
	}

	if (ts.isFunctionLike(node)) {
		const isAsync = ts.canHaveModifiers(node) &&
			ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
		if (isAsync) {
			nodeIsAsyncFunction = true;
			locker = getLocker(context);
			if (ts.isArrowFunction(node)) {
				node = addBodyBlockToArrowFunction(node, context.factory);
			}
		} else {
			locker = null;
		}

		// turn await expressions into yield expressions
	} else if (!globalScope && ts.isAwaitExpression(node)) {
		node = context.factory.createYieldExpression(
			undefined,
			node.expression,
		);
		awaitEncounteredCallback?.();

		// global scope should keep for await loops (this can't be tested with the current test setup)
	} else if (!globalScope && ts.isForOfStatement(node) && node.awaitModifier != null) {
		node = replaceForAwaitOfLoop(
			node,
			imports.getAsyncValues,
			context.factory,
		);
	}

	const defaultVisitor = visitor(
		imports,
		globalScope && !ts.isFunctionLike(node),
		nodeIsAsyncFunction,
		locker,
		awaitEncounteredCallback,
		context,
	);
	if (ts.isTryStatement(node) && locker != null) {
		let finallyBlockHasAwaitExpression = false;
		// keep order of visitation
		const tryBlock = ts.visitNode(node.tryBlock, defaultVisitor);
		const catchClause = ts.visitNode(node.catchClause, defaultVisitor);
		let finallyBlock = ts.visitNode(
			node.finallyBlock,
			visitor(
				imports,
				false,
				nodeIsAsyncFunction,
				// don't apply this logic to nested finally blocks
				null,
				() => finallyBlockHasAwaitExpression = true,
				context,
			),
		);

		if (finallyBlockHasAwaitExpression) {
			finallyBlock = addLockCallsToFinallyBlock(
				finallyBlock,
				locker.getLocker,
				imports.getContinueWithLastYieldToken,
				context.factory,
			);
		}

		return context.factory.updateTryStatement(
			node,
			tryBlock,
			catchClause,
			finallyBlock,
		);
	}

	node = ts.visitEachChild(node, defaultVisitor, context);

	// turn async functions into generators wrapped by runAsync
	if (ts.isBlock(node) && parentIsAsyncFunction) {
		if (locker?.isLockerUsed) {
			node = wrapBlockWithLockReturnCalls(
				node,
				locker.getLocker,
				imports.getLockReturnCalls,
				context.factory,
			);
		}

		return wrapBlockWithrunAsync(
			node as ts.Block,
			imports.getRunAsync,
			context.factory,
		);
	}

	return node;
};

type Imports = {
	readonly getRunAsync: ts.Identifier;
	readonly getContinueWithLastYieldToken: ts.Identifier;
	readonly getLockReturnCalls: ts.Identifier;
	readonly getAsyncValues: ts.Identifier;
};

export default (module: string) => (context: ts.TransformationContext) => {
	return (node: ts.SourceFile) => {
		const getRunAsync = context.factory.createUniqueName('runAsync');
		const getContinueWithLastYieldToken = context.factory.createUniqueName('continueWithLastYieldToken');
		const getLockReturnCalls = context.factory.createUniqueName('lockReturnCalls');
		const getAsyncValues = context.factory.createUniqueName('asyncValues');

		let importRequired = false;
		const requiredNamedImports: Record<string, ts.Identifier> = {};

		const imports: Imports = {
			get getRunAsync() {
				importRequired = true;
				return getRunAsync;
			},
			get getContinueWithLastYieldToken() {
				requiredNamedImports.continueWithLastYieldToken = getContinueWithLastYieldToken;
				return getContinueWithLastYieldToken;
			},
			get getLockReturnCalls() {
				requiredNamedImports.lockReturnCalls = getLockReturnCalls;
				return getLockReturnCalls;
			},
			get getAsyncValues() {
				requiredNamedImports.asyncValues = getAsyncValues;
				return getAsyncValues;
			},
		};

		node = ts.visitNode(node, visitor(imports, true, false, null, null, context));

		if (importRequired) {
			node = context.factory.updateSourceFile(node, [
				context.factory.createImportDeclaration(
					undefined,
					context.factory.createImportClause(
						false,
						getRunAsync,
						Object.values(requiredNamedImports).length > 0
							? context.factory
								.createNamedImports(Object.entries(requiredNamedImports).map(([name, identifier]) =>
									context.factory.createImportSpecifier(
										false,
										context.factory.createIdentifier(name),
										identifier,
									)
								))
							: undefined,
					),
					context.factory.createStringLiteral(module),
					undefined,
				),

				...node.statements,
			]);
		}

		return node;
	};
};
