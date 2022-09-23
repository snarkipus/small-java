import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { SmallJavaTypeComputer  as SJcompute} from '../util/small-java-type-computer';
import { SJExpression, SJMethod, SJProgram, SJStatement } from '../language-server/generated/ast';
import { createSmallJavaServices } from '../language-server/small-java-module';


const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const helper = parseHelper<SJProgram>(services);


describe('Small Java Type Computer', () => {

    it('thisType()', async () => {
        assertType('this', 'C');
    });

    it('paramRefType()', async () => {
        assertType('p', 'P');
    });

    it('varRefType()', async () => {
        assertType('v', 'V');
    });

    it('newType()', async () => {
        assertType('new C()', 'C');
    });

    it('fieldSelectionType()', async () => {
        assertType('this.f', 'F');
    });

    it('methodInvocationType()', async () => {
        assertType('this.m(new P())', 'R');
    });

    it('assignmentType()', async () => {
        assertType('v = new V()', 'V');
    });

    it('stringConstantType()', async () => {
        assertType('"hello"', 'stringType');
    })

    it('intConstantType()', async () => {
        assertType('1', 'intType');
    });

    it('boolConstantType()', async () => {
        assertType('true', 'booleanType');
    });

    it('nullType()', async () => {
        assertType('null', 'nullType');
    });

})

async function assertType(testExp: string, expectedClassName: string) {
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

function statementExpressionType(s: SJStatement) {
    return SJcompute.typeFor(s as SJExpression);
}