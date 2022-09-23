// import { AstNode, AstNodeDescription, DefaultScopeComputation, interruptAndCheck, LangiumDocument, LangiumServices, MultiMap, PrecomputedScopes, streamAllContents } from 'langium';
import { AstNodeDescription, DefaultScopeComputation, interruptAndCheck, LangiumDocument, LangiumServices, streamAllContents } from 'langium';

import { CancellationToken } from 'vscode-jsonrpc';
import { SmallJavaNameProvider } from './small-java-naming';
import { isSJMember, SJClass, isSJClass } from './generated/ast';

export class SmallJavaScopeComputation extends DefaultScopeComputation {

    constructor(services: LangiumServices) {
        super(services);
    }

    /**
     * Exports only types (`SJField or `SJMethod`) with their qualified names.
     */
    async computeExports(document: LangiumDocument, cancelToken = CancellationToken.None): Promise<AstNodeDescription[]> {
        const descr: AstNodeDescription[] = [];
        for (const modelNode of streamAllContents(document.parseResult.value)) {
            await interruptAndCheck(cancelToken);
            if (isSJMember(modelNode)) {
                let name = this.nameProvider.getName(modelNode);
                if (name) {
                    if (isSJClass(modelNode.$container)) {
                        name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(modelNode.$container as SJClass, name);
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

    // protected async processContainer(container: SJProgram | SJClass, scopes: PrecomputedScopes, document: LangiumDocument, cancelToken: CancellationToken): Promise<AstNodeDescription[]> {
    //    const localDescriptions: AstNodeDescription[] = [];
    //     // for (const cls of container.classes) {
    //     // case/switch for container type
    //     switch (container.$type) {
    //         case 'SJProgram':
    //             for (const cls of (container as SJProgram).classes) {
    //                 await interruptAndCheck(cancelToken);
    //                 const nestedDescriptions = await this.processContainer(cls, scopes, document, cancelToken);
    //                 for (const description of nestedDescriptions) {
    //                     // Add qualified names to the container
    //                     const qualified = this.createQualifiedDescription(cls, description, document);
    //                     localDescriptions.push(qualified);
    //                 }
    //             }
    //         case 'SJClass':
    //             await interruptAndCheck(cancelToken);    
    //             for (const member of (container as SJClass).members) {
    //                     const description = this.descriptions.createDescription(member, member.name, document);
    //                     localDescriptions.push(description);
    //             } 
    //     }
                
    //     scopes.addAll(container, localDescriptions);
    //     return localDescriptions;
    // }

    protected createQualifiedDescription(pack: SJClass, description: AstNodeDescription, document: LangiumDocument): AstNodeDescription {
        const name = (this.nameProvider as SmallJavaNameProvider).getQualifiedName(pack.name, description.name);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return this.descriptions.createDescription(description.node!, name, document);
    }

}
 