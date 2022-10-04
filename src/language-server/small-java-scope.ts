import { AstNodeDescription, DefaultScopeComputation, getContainerOfType, interruptAndCheck, LangiumDocument, LangiumServices, PrecomputedScopes, streamAllContents } from 'langium';
import { CancellationToken } from 'vscode-jsonrpc';
import { SmallJavaNameProvider } from './small-java-naming';
import { SJProgram, isSJProgram, isSJMember, SJClass, isSJClass, isSJVariableDeclaration, isSJParameter, isSJNamedElement, isSJMethod, isSJBlock } from './generated/ast';
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
                            name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJMethod)!.name, name);
                            name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJClass)!.name, name);
                        }
                    } else if (isSJBlock(modelNode.$container)) {
                        if (isSJVariableDeclaration(modelNode)) {
                            name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJMethod)!.name, name);
                            name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(getContainerOfType(modelNode, isSJClass)!.name, name);
                        }
                    }
                    descr.push(this.descriptions.createDescription(modelNode, name, document));
                }
            }
        }
        return descr;
    }

    // async computeLocalScopes(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<PrecomputedScopes> {
    //     const model = document.parseResult.value as SJProgram;
    //     const scopes = new MultiMap<AstNode, AstNodeDescription>();
    //     await this.processContainer(model, scopes, document, cancelToken);
    //     return scopes;
    // }

    protected async processContainer(container: SJProgram | SJClass, scopes: PrecomputedScopes, document: LangiumDocument, cancelToken: CancellationToken): Promise<AstNodeDescription[]> {
        const localDescriptions: AstNodeDescription[] = [];
        
        if (isSJProgram(container)) {
            for (const element of container.classes) {
                await interruptAndCheck(cancelToken);
                if (isSJMember(element)) {
                    const description = this.descriptions.createDescription(element, element.name, document);
                    localDescriptions.push(description);
                } else if (isSJClass(element)) {
                    const nestedDescriptions = await this.processContainer(element, scopes, document, cancelToken);
                    for (const description of nestedDescriptions) {
                        // Add qualified names to the container
                        const qualified = this.createQualifiedDescription(element, description, document);
                        localDescriptions.push(qualified);
                    }
                }
            }
        }        
         
        // for (const element of container.elements) {            
        //     if (isSJMember(element)) {
        //         const description = this.descriptions.createDescription(element, element.name, document);
        //         localDescriptions.push(description);
        //     } else if (isSJClass(element)) {
        //         const nestedDescriptions = await this.processContainer(element, scopes, document, cancelToken);
        //         for (const description of nestedDescriptions) {
        //             // Add qualified names to the container
        //             const qualified = this.createQualifiedDescription(element, description, document);
        //             localDescriptions.push(qualified);
        //         }
        //     }
        // }
        
        scopes.addAll(container, localDescriptions);
        return localDescriptions;
    }

    protected createQualifiedDescription(cls: SJClass, description: AstNodeDescription, document: LangiumDocument): AstNodeDescription {
        const name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(cls.name, description.name);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.descriptions.createDescription(description.node!, name, document);
    }

}
 