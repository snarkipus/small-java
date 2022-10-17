import { getContainerOfType, Reference } from 'langium';
import { SJExpression, SJClass, SJNew, SJSymbolRef, SJMemberSelection, SJAssignment, isSJClass, SJMember, SJBlock, SJIfStatement, SJMethod, SJProgram, SJReturn, SJVariableDeclaration, isSJMethod } from '../language-server/generated/ast'; 

export class IntType implements SJClass {
    $container!: SJAssignment | SJBlock | SJClass | SJIfStatement | SJMemberSelection | SJMethod | SJProgram | SJReturn | SJVariableDeclaration
    members: Array<SJMember> = []
    name: string = 'intType'
    superClass?: Reference<SJClass>
    $type!: 'SJIntConstant'
}

export class StringType implements SJClass {
    $container!: SJAssignment | SJBlock | SJClass | SJIfStatement | SJMemberSelection | SJMethod | SJProgram | SJReturn | SJVariableDeclaration
    members: Array<SJMember> = []
    name: string = 'stringType'
    superClass?: Reference<SJClass>
    $type!: 'SJStringConstant'
}

export class BoolType implements SJClass {
    $container!: SJAssignment | SJBlock | SJClass | SJIfStatement | SJMemberSelection | SJMethod | SJProgram | SJReturn | SJVariableDeclaration
    members: Array<SJMember> = []
    name: string = 'booleanType'
    superClass?: Reference<SJClass>
    $type!: 'SJBoolConstant'
}

export class NullType implements SJClass {
    $container!: SJAssignment | SJBlock | SJClass | SJIfStatement | SJMemberSelection | SJMethod | SJProgram | SJReturn | SJVariableDeclaration
    members: Array<SJMember> = []
    name: string = 'nullType'
    superClass?: Reference<SJClass>
    $type!: 'SJNull'
}

export class SmallJavaTypeComputer {

    public static STRING_TYPE = new StringType();
    public static INT_TYPE    = new IntType();
    public static BOOL_TYPE   = new BoolType();
    public static NULL_TYPE   = new NullType();

    typeFor(e: SJExpression): SJClass | undefined {
        switch(e.$type) {
            case 'SJNew':             return (e as SJNew).type.ref;
            case 'SJSymbolRef':       return (e as SJSymbolRef).symbol.ref?.type.ref;
            case 'SJMemberSelection': return (e as SJMemberSelection).member.ref?.type.ref;
            case 'SJAssignment':      return this.typeFor((e as SJAssignment).left);
            case 'SJThis':            return getContainerOfType(e, isSJClass);
            case 'SJSuper':           return (getContainerOfType(e, isSJClass))?.superClass?.ref;
            case 'SJNull':            return SmallJavaTypeComputer.NULL_TYPE;
            case 'SJStringConstant':  return SmallJavaTypeComputer.STRING_TYPE;
            case 'SJIntConstant':     return SmallJavaTypeComputer.INT_TYPE;
            case 'SJBoolConstant':    return SmallJavaTypeComputer.BOOL_TYPE;
            default: throw new Error('Unknown Type');
        }
    }

    isPrimitive(c: SJClass): boolean {
        return c.$container === undefined;
    }

    expectedType(e: SJExpression): SJClass | undefined {
        const c = e.$container;
        const f = e.$containerProperty;
        switch(c.$type) {
            case 'SJVariableDeclaration':
                return (c as SJVariableDeclaration).type.ref;

            case 'SJAssignment': {
                if (f === 'right') {
                    return this.typeFor((c as SJAssignment).left);
                } else if (f === 'left') {
                    return this.typeFor((c as SJAssignment).right);
                }
            }

            case 'SJReturn':
                return getContainerOfType(c, isSJMethod)?.type.ref;

            case 'SJIfStatement':
                    if (f === 'expression') {
                        return SmallJavaTypeComputer.BOOL_TYPE;
                    }

            case 'SJMemberSelection':
                if (f === 'args') {
                    try {
                        return ((c as SJMemberSelection)
                                    .member.ref as SJMethod)
                                    .params[((c as SJMemberSelection).args.indexOf(e))]
                                    ?.type.ref;
                    } catch (e) {
                        return undefined;
                    }
                }

            default: return undefined;
        }
    }
} 