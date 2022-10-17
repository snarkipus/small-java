import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { SmallJavaTypeComputer} from '../util/small-java-type-computer';
import { SJAssignment, SJClass, SJExpression, SJIfStatement, SJMemberSelection, SJMethod, SJProgram, SJReturn, SJStatement, SJVariableDeclaration } from '../language-server/generated/ast';
import { createSmallJavaServices } from '../language-server/small-java-module';

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const helper = parseHelper<SJProgram>(services);
const typeComputer = new SmallJavaTypeComputer();

describe('Small Java Type Computer', () => {

    it('thisType()', async () => {
        assertType('this', 'C');
    });

    it('paramRefType()', async () => {
        assertType('p', 'P');
    });

    // TODO: this test has issues now 
    it.skip('varRefType()', async () => {
        assertType('v', 'V');
    });

    it('newType()', async () => {
        assertType('new N()', 'N');
    });

    it('fieldSelectionType()', async () => {
        assertType('this.f', 'F');
    });

    it('methodInvocationType()', async () => {
        assertType('this.m(new P())', 'R');
    });

    it('assignmentType()', async () => {
        assertType('v = new P()', 'V');
    });

    it('stringConstantType()', async () => {
        assertType('"foo"', 'stringType');
    })

    it('intConstantType()', async () => {
        assertType('10', 'intType');
    });

    it('boolConstantType()', async () => {
        assertType('true', 'booleanType');
    });

    it('nullType()', async () => {
        assertType('null', 'nullType');
    });

    it('Unresolved Reference Types', async () => {
        const text=`
        class C {
            U m() {
                f ;       // unresolved symbol
                this.n(); // unresolved method
                this.f;   // unresolved field
                return null;
            }
        }
        `;

        const parse = await helper(text);
        const statements = (parse.parseResult.value
                            .classes[0]
                            .members[0] as SJMethod)
                            .body
                            .statements;

        expect(statementExpressionType(statements[0])).toBeUndefined();
        expect(statementExpressionType(statements[1])).toBeUndefined();
        expect(statementExpressionType(statements[2])).toBeUndefined();
    });

    it('Primitive Types', async() => {
        const text=`
        class C {
            C m() {
                return true;
            }
        }
        `;

        const parse = await helper(text);
        const statement = ((parse.parseResult.value
                            .classes[0]
                            .members[0] as SJMethod)
                            .body
                            .statements[0] as SJReturn)
                            .expression;
        const type = typeComputer.typeFor(statement);

        expect(typeComputer.isPrimitive(type!)).toBeTruthy();
    });

    it('Expected Variable Declaration Type', async() => {
        const text=`V v = null;`;
        const exp = ((await testStatements(text))[0] as SJVariableDeclaration).expression;
        assertExpectedType(exp!, 'V');
    });

    it('Expected Assignment Types (right)', async () => {
        const text=`this.f = null`;
        const exp = ((await testStatements(text))[0] as SJAssignment).right;
        assertExpectedType(exp, 'F');
    });

    it('Expected Assignment Types (left)', async () => {
        const text=`this.f = null`;
        const exp = ((await testStatements(text))[0] as SJAssignment).left;
        assertExpectedType(exp, 'nullType');
    });

    it('Expected Return Types', async () => {
        const text=``;
        const exp = ((await testStatements(text))[0] as SJReturn).expression;
        assertExpectedType(exp, 'R');
    });

    it('Expected If Expressions Types', async () => {
        const text=`if (e) {}`;
        const exp = ((await testStatements(text))[0] as SJIfStatement).expression;
        assertExpectedType(exp, 'booleanType');
    });

    it('Expected Method Invocation Argument Types', async () => {
        const text=`this.m(new P1(), new P2())`;
        const exp = ((await testStatements(text))[0] as SJMemberSelection).args;
        assertExpectedType(exp[0], 'P1');
        assertExpectedType(exp[1], 'P2');
    });

    it('Expected Method Invocation Receiver Types', async () => {
        const text=`this.m()`;
        const exp = ((await testStatements(text))[0] as SJMemberSelection).receiver;
        const type = typeComputer.expectedType(exp);
        expect(type).toBeUndefined();
    });

    it('Expected Stand Alone Member Selection Types', async () => {
        const text=`
        class A {
            A a;
            A m() { this.a; this.m(); return null; }
        }`;
        
        const parse = await helper(text);
        const statements = (parse.parseResult.value
                            .classes[0]
                            .members[1] as SJMethod)
                            .body
                            .statements;

        expect(typeComputer.expectedType(statements[0])).toBeUndefined();
        expect(typeComputer.expectedType(statements[1])).toBeUndefined();
    });

    it('Expected Wrong Method Invocation Argument Types (1)', async () => {
        const text=`this.n(new P1(), new P2());`;
        const exp = ((await testStatements(text))[0] as SJMemberSelection).args;
        expect(typeComputer.expectedType(exp[0])).toBeUndefined();
        expect(typeComputer.expectedType(exp[1])).toBeUndefined();
    });

    it('Expected Wrong Method Invocation Argument Types (2)', async () => {
        const text=`this.m(new P1(), new P2(), new P1());`;
        const exp = ((await testStatements(text))[0] as SJMemberSelection).args;
        expect(typeComputer.expectedType(exp[2])).toBeUndefined();
    });

});

async function assertType(testExp: string, expectedClassName: string): Promise<void> {
    const text=`
    class R { }
    class P { }
    class V { }
    class N { }
    class F { }
    
    class C {
      F f;
      
      R m(P p) {
        V v = null;
        ${testExp};
        return null;
      }
    }
    `;

    const parse = await helper(text);
    const classes = parse.parseResult.value.classes;
    const lastClass = classes.length - 1;
    const lastMember = (classes[lastClass].members).length - 1;
    const expression = (classes[lastClass].members[lastMember] as SJMethod).body.statements[1] as SJExpression;
    expect(statementExpressionType(expression)?.name).toBe(expectedClassName);
}

function statementExpressionType(s: SJStatement): SJClass | undefined {
    return typeComputer.typeFor(s as SJExpression);
}

async function testStatements(statement: string): Promise<SJStatement[]> {
    const text=`
    class R { }
    class P1 { }
    class P2 { }
    class V { }
    class F { }
    
    class C {
      F f;      
      R m(P1 p, P2 p2) {
        ${statement}
        return null;
      }
    }
    `;

    const parse = await helper(text);
    const statements = (parse.parseResult.value
                            .classes[5]
                            .members[1] as SJMethod)
                            .body
                            .statements;
    return statements;
}

function assertExpectedType(exp: SJExpression, expectedClassName: string): void {
    let name = typeComputer.expectedType(exp)?.name;
    expect(name).toBe(expectedClassName);
}
