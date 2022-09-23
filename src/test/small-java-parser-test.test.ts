import { parseHelper } from 'langium/test';
import { SJProgram, SJMethod, SJStatement, SJAssignment, SJMemberSelection, SJNew, SJSymbolRef, SJReturn, SJIfStatement } from '../language-server/generated/ast';
import { createSmallJavaServices } from '../language-server/small-java-module';
import { EmptyFileSystem } from 'langium';

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const helper = parseHelper<SJProgram>(services);

describe('Small Java Parser', () => {

    it('parses: member selection left associativity', async () => {
        let text = `
        class A {
            A m() { return this.m().m(); }
        }`;
        let parse = await helper(text);
        const testArg = (parse
                            .parseResult
                            .value
                            .classes[0]
                            .members as SJMethod[])[0]
                            .body
                            .statements;

        assertAssociativity(testArg[testArg.length-1],'((this.m).m)');
    });

    it('parses: assignment right associativity', async () => {
        let text = `
        class A {
            A m() {
                A f = null;
                A g = null;
                f = g = null;    
            }
        }`;
        let parse = await helper(text);
        const testArg = (parse
                            .parseResult
                            .value
                            .classes[0]
                            .members as SJMethod[])[0]
                            .body
                            .statements;

        assertAssociativity(testArg[testArg.length-1],'(f = (g = null))');
    });

    it('parses: dangling Else', async () => {
        let text = `
        class C {
            C c;
            C m() {
                if (true)
                    if (false)
                        this.c = null;
                    else
                        this.c = null;
                return this.c;
            }
        }`;

        let parse = await helper(text);
        const ifS = (parse
                        .parseResult
                        .value
                        .classes[0]
                        .members as SJMethod[])[1]
                        .body!
                        .statements[0] as SJIfStatement;

        expect(ifS.elseBlock).not.toBeDefined();
    });

    it('parses: Else with Block', async () => {
        let text = `
		class C {
			C c;
			C m() {
				if (true) {
					if (false)
						this.c = null;
				} else
						this.c = null;
				return this.c;
			}
		}`;

        let parse = await helper(text);
        const ifS = (parse
                        .parseResult
                        .value
                        .classes[0]
                        .members as SJMethod[])[1]
                        .body!
                        .statements[0] as SJIfStatement;

        expect(ifS.elseBlock).toBeDefined();
    });

    function assertAssociativity(s: SJStatement, expected: string) {
        expect(expected.toString()).toBe(stringRepr(s));
    }

    function stringRepr(s: SJStatement): string {
        switch (s.$type) {
            case 'SJAssignment':        return `(${stringRepr((s as SJAssignment).left)} = ${stringRepr((s as SJAssignment).right)})`;
            case 'SJMemberSelection':   return `(${stringRepr((s as SJMemberSelection).receiver)}.${(s as SJMemberSelection).member.ref!.name})`;
            case 'SJThis':              return `this`;
            case 'SJNew':               return `new ${(s as SJNew).type.ref!.name}()`;
            case 'SJNull':              return `null`;
            case 'SJSymbolRef':         return (s as SJSymbolRef).symbol.ref!.name;
            case 'SJReturn':            return `${stringRepr((s as SJReturn).expression)}`
            default: throw new Error(`Unknown statement type: ${s.$type}`);
        }
    }
});