import { AstNode, AstNodeDescription, DefaultScopeComputation, DefaultScopeProvider, EMPTY_SCOPE, getContainerOfType, getDocument, interruptAndCheck, LangiumDocument, LangiumServices, MultiMap, PrecomputedScopes,
     ReferenceInfo, Scope, stream, Stream, streamAllContents } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { SmallJavaNameProvider } from './small-java-naming';
import { SJClass, isSJClass, isSJVariableDeclaration, isSJParameter, isSJNamedElement, isSJMethod, isSJBlock, SJProgram, SJMethod } from './generated/ast';
import { SmallJavaServices } from './small-java-module';
import { isDefinedBefore } from '../util/small-java-model-util';

export class SmallJavaScopeProvider extends DefaultScopeProvider {
    
    constructor(services: SmallJavaServices) {
        super(services);
    }

    getScope(context: ReferenceInfo): Scope {
        const scopes: Array<Stream<AstNodeDescription>> = [];
        const referenceType = this.reflection.getReferenceType(context);

        switch (referenceType) {
            case 'SJSymbol':
                const precomputed = getDocument(context.container).precomputedScopes;
                if (precomputed) {
                    let currentNode: AstNode | undefined = context.container;
                    do {
                        const allDescriptions = precomputed.get(currentNode);
                        if (allDescriptions.length > 0) {
                            scopes.push(stream(allDescriptions)
                                .filter(desc => this.reflection.isSubtype(desc.type, referenceType))
                                .filter(desc => isDefinedBefore(desc.node!, context.container.$container!))
                            );
                        }
                        currentNode = currentNode.$container;
                    } while (currentNode);
                }
        
                let result: Scope = EMPTY_SCOPE;
                for (let i = scopes.length - 1; i >= 0; i--) {
                    result = this.createScope(scopes[i], result);
                }
                return result;

            default:
                return super.getScope(context);
        }
    }
}


export class SmallJavaScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }

    /**
     * Qualified Name Export Types: `SJClass`, `SJMember`, `SJParameter`, `SJVariableDeclaration` 
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
            super.processNode(node, document, scopes);
        }
        return scopes;
    }

    protected async scopeContainer(node: any, document: LangiumDocument, scopes: PrecomputedScopes, cancelToken = CancellationToken.None): Promise<void> {
        await interruptAndCheck(cancelToken);
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
