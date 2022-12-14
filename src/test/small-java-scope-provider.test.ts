import { AstNode, EmptyFileSystem, LangiumDocument, Reference } from "langium";
import { parseDocument } from "langium/test";
import { SJBlock, SJIfStatement, SJMethod, SJProgram, SJVariableDeclaration } from "../language-server/generated/ast";
import { createSmallJavaServices } from "../language-server/small-java-module";


describe('Small Java Scope Provider', async () => {
    
    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;

    let testDoc : LangiumDocument<AstNode>;
    let refNode : AstNode;
    let v3Ref : AstNode;
    let v4Ref : AstNode;

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

        v3Ref = ((((refNode as SJBlock)
                    .statements[1] as SJIfStatement)
                    .thenBlock)
                    .statements[1] as SJVariableDeclaration)
                    .expression;

        v4Ref = ((refNode as SJBlock)
                    .statements[2] as SJVariableDeclaration)
                    .expression; 
    });

    it('Computes SJSymbolRef:SJSymbol scopes for v3 declaration -> v2, v1, p', () => {
        const context = {
            $type: 'SJSymbolRef',
            $container: v3Ref.$container,
            $containerProperty: 'symbol'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: context.$containerProperty
        };

        let scope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = scope.getAllElements().map(e => e.name).join(', ');
        expect(computedScope).toBe('v2, v1, p');
    });

    it('Computes SJSymbolRef:SJSymbol scopes for v4 declaration -> v1, p', () => {
        const context = {
            $type: 'SJSymbolRef',
            $container: v4Ref.$container,
            $containerProperty: 'symbol'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: context.$containerProperty
        };

        let scope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = scope.getAllElements().map(e => e.name).join(', ');
        expect(computedScope).toBe('v1, p');
    });

});
