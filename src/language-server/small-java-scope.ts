import { AstNode, AstNodeDescription, DefaultScopeComputation, getContainerOfType, interruptAndCheck, LangiumDocument, LangiumServices, MultiMap, PrecomputedScopes, streamAllContents } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { SmallJavaNameProvider } from './small-java-naming';
import { SJClass, isSJClass, isSJVariableDeclaration, isSJParameter, isSJNamedElement, SJMethod, isSJMethod, isSJBlock, SJProgram, SJBlock, isSJExpression } from './generated/ast';

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
            this.processContainer(node, scopes, document);
        }

        return scopes;
    }

    protected processContainer(node: AstNode, scopes: PrecomputedScopes, document: LangiumDocument): void {
        const container = node.$container;
        if (container) {
            switch (container.$type) {
                case 'SJMethod':
                    for (const param of (container as SJMethod).params) {
                        scopes.add(container, this.descriptions.createDescription(param, param.name, document));
                    }
                case 'SJBlock':
                    const statements = (container as SJBlock).statements;
                    if (statements) {
                        for (const statement of (container as SJBlock).statements.filter(isSJExpression)) {
                            const name = this.nameProvider.getName(statement);
                            if (name) {
                                scopes.add(container, this.descriptions.createDescription(statement, name, document));
                            }
                        };
                    }
                default: 
                    const name = this.nameProvider.getName(node);
                    if (name) {
                        scopes.add(container, this.descriptions.createDescription(node, name, document));
                    }
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
