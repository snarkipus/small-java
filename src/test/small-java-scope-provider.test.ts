import { AstNode, EmptyFileSystem, LangiumDocument, Reference } from "langium";
import { parseDocument } from "langium/test";
import { SJBlock, SJIfStatement, SJMethod, SJProgram } from "../language-server/generated/ast";
import { createSmallJavaServices } from "../language-server/small-java-module";


describe.skip('Magical Thing', async () => {
    
    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;

    let testDoc : LangiumDocument<AstNode>;
    let refNode : AstNode;
    let v3Ref : AstNode;

    beforeAll(async () => {
        const text=`
        class C {
            A m(A p) {
                A v1 = null;
                if (true) {
                    A v2 = null;
                    A v3 = null;
                }
                A v4 = null;
                return null;
            }
        }
        class A {}
        `;

        testDoc = await parseDocument(services, text);
        refNode = ((testDoc.parseResult.value as SJProgram)
                        .classes[0]
                        .members[0] as SJMethod)
                        .body;

        v3Ref = (((refNode as SJBlock)
                    .statements[1] as SJIfStatement)
                    .thenBlock)
                    .statements[1];
        
        // let testStream = streamAllContents(refNode).find(node => node as AstNode === 'v3');

        // let testStream2 = _.takeWhile(testStream, != v3Ref);
        //                     .filter(isSJVariableDeclaration)
        //                     .map(e => e.name);//?


        // findFirst[name == 'v3']
        //     .expression
        //     .assertScope(SmallJavaPackage.eINSTANCE.SJSymbolRef_Symbol, "v2, v1, p")
    });

    it('Does Things', () => {
        const context = {
            $type: 'SJSymbolRef',
            $container: v3Ref,
            $containerProperty: 'symbol'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: 'symbol'
        };

        let tempScope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = tempScope.getAllElements().map(e => e.name).join(', ');
        expect('A').toBe(computedScope);
    });

});