import { AstNode, AstNodeDescription, DefaultScopeComputation, getContainerOfType, interruptAndCheck, LangiumDocument, LangiumServices, MultiMap, PrecomputedScopes, streamAllContents } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { SmallJavaNameProvider } from './small-java-naming';
import { SJClass, isSJClass, isSJVariableDeclaration, isSJParameter, isSJNamedElement, SJMethod, isSJMethod, isSJBlock, SJProgram, SJSymbolRef, SJBlock, SJVariableDeclaration } from './generated/ast';

export class SmallJavaScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }

    /**
     * Qualified Name Export Types:
     *  - `SJClass`
     *  - `SJMember`
     *  - `SJParameter`
     *  - `SJVariableDeclaration` 
     */
    async computeExports(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<AstNodeDescription[]> {
        const descr: AstNodeDescription[] = [];
        for (const modelNode of streamAllContents(document.parseResult.value)) {
            await interruptAndCheck(cancelToken);
            if (isSJNamedElement(modelNode)) {
                let name = this.nameProvider.getName(modelNode);
                if (name) {
                    if (isSJClass(modelNode.$container)) {
                        name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(modelNode.$container as SJClass, name);
                    } else if (isSJMethod(modelNode.$container)) {
                        if (isSJParameter(modelNode)) {
                            const firstName = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJMethod)!.name, name);
                            name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJClass)!.name, firstName);
                        }
                    } else if (isSJBlock(modelNode.$container)) {
                        if (isSJVariableDeclaration(modelNode)) {
                            const firstName = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJMethod)!.name, name);
                            name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJClass)!.name, firstName );
                        }
                    }
                    descr.push(this.descriptions.createDescription(modelNode, name, document));
                }
            }
        }
        return descr;
    }

    async computeLocalScopes(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<PrecomputedScopes> {
        const program = document.parseResult.value as SJProgram;
        const scopes = new MultiMap<AstNode, AstNodeDescription>();
        for (const node of streamAllContents(program)) {
            await interruptAndCheck(cancelToken);
            switch (node.$type) {
                case 'SJSymbolRef':
                    this.scopeForSymbolRef(node as SJSymbolRef, document, scopes);
                
                default:
                    super.processNode(node, document, scopes);
            }
        }
        return scopes;
    }

    protected scopeForSymbolRef(node: any, document: LangiumDocument, scopes: PrecomputedScopes): void {
        const container = node.$container;
        if (container) {
            switch (container.$type) {
                case 'SJMethod':
                    //<<<Xtext>>>
                    //
                    // SJMethod: Scopes.scopeFor(container.params)
                    for (const param of (container as SJMethod).params) {
                        scopes.add(container, this.descriptions.createDescription(param, param.name, document));
                    }

                case 'SJBlock':
                    //<<<Xtext>>>
                    //
                    // 	SJBlock:
                    // 		Scopes.scopeFor(
                    // 			container.statements.takeWhile[it != context].filter(SJVariableDeclaration),
                    // 			scopeForSymbolRef(container) // outer scope
                    // 		)
                    const statements = (container as SJBlock).statements;
                    if(statements) {
                        for (const statement of statements) {
                            isSJVariableDeclaration(statement) ?? scopes.add(
                                container,
                                this.descriptions.createDescription(statement, (statement as SJVariableDeclaration).name, document)
                            );
                        }
                    }
                    
                default: 
                    this.scopeForSymbolRef(container, document, scopes);
            }
        }      
    }

    // protected createQualifiedDescription(cls: SJClass, description: AstNodeDescription, document: LangiumDocument): AstNodeDescription {
    //     const name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(cls.name, description.name);
    //     // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    //     return this.descriptions.createDescription(description.node!, name, document);
    // }

// }
}

/**
 * Xtext Implementation
 */

//  class SmallJavaScopeProvider extends AbstractSmallJavaScopeProvider {

// 	val epackage = SmallJavaPackage.eINSTANCE
// 	@Inject extension SmallJavaModelUtil
// 	@Inject extension SmallJavaTypeComputer

// 	override getScope(EObject context, EReference reference) {
// 		if (reference == epackage.SJSymbolRef_Symbol) {
// 			return scopeForSymbolRef(context)
// 		} else if (context instanceof SJMemberSelection) {
// 			return scopeForMemberSelection(context)
// 		}
// 		return super.getScope(context, reference)
// 	}

// 	def protected IScope scopeForSymbolRef(EObject context) {
// 		val container = context.eContainer
// 		return switch (container) {
// 			SJMethod:
// 				Scopes.scopeFor(container.params)
// 			SJBlock:
// 				Scopes.scopeFor(
// 					container.statements.takeWhile[it != context].filter(SJVariableDeclaration),
// 					scopeForSymbolRef(container) // outer scope
// 				)
// 			default:
// 				scopeForSymbolRef(container)
// 		}
// 	}

// 	def protected IScope scopeForMemberSelection(SJMemberSelection sel) {
// 		val type = sel.receiver.typeFor

// 		if (type === null || type.isPrimitive)
// 			return IScope.NULLSCOPE

// 		val grouped = type.
// 			classHierarchyMembers.groupBy[it instanceof SJMethod]
// 		val inheritedMethods = grouped.get(true) ?: emptyList
// 		val inheritedFields = grouped.get(false) ?: emptyList

// 		if (sel.methodinvocation) {
// 			return Scopes.scopeFor(
// 				type.methods + type.fields,
// 				Scopes.scopeFor(inheritedMethods + inheritedFields)
// 			)
// 		} else {
// 			return Scopes.scopeFor(
// 				type.fields + type.methods,
// 				Scopes.scopeFor(inheritedFields + inheritedMethods)
// 			)
// 		}
// 	}

// }