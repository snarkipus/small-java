import { AstNode, NamedAstNode, Stream, stream, streamAllContents, ValidationAcceptor, ValidationChecks, ValidationRegistry } from 'langium';
import { SmallJavaAstType, SJClass, SJMemberSelection, SJBlock, isSJReturn, isSJField, isSJMethod, SJMethod, SJProgram, isSJVariableDeclaration, SJExpression } from './generated/ast';
import type { SmallJavaServices } from './small-java-module';
import { SmallJavaModeUtil as util } from '../util/small-java-model-util';
import { MultiMap } from 'langium';
import { SmallJavaTypeComputer as SJcompute } from '../util/small-java-type-computer';
import { SmallJavaTypeConformance as SJconform } from '../util/small-java-type-conformance';

/**
 * Registry for validation checks.
 */
export class SmallJavaValidationRegistry extends ValidationRegistry {
    constructor(services: SmallJavaServices) {
        super(services);
        const validator = services.validation.SmallJavaValidator;
        const checks: ValidationChecks<SmallJavaAstType> = {
            SJClass: validator.checkClassHierarchy,            
            SJProgram: [
                validator.checkNoDuplicateClasses,
                validator.checkNoDuplicateFields,
                validator.checkNoDuplicateMethods,
                validator.checkNoDuplicateParams,
            ],
            SJMemberSelection: validator.checkMemberSelection,
            SJBlock: [
                validator.checkUnreachableCode,
                validator.checkNoDuplicateVariables,
            ],
            SJMethod: validator.checkMethodEndsWithReturn,
            // SJExpression: validator.checkConformance,
        };
        this.register(checks, validator);
    }
}

/**
 * Used for Grammar Code Actions.
 */
export namespace IssueCodes {
    export const ClassHierarchy = 'class-hierarchy';
    export const MemberSelection = 'member-selection';
    export const UnreachableCode = 'unreachable-code';
    export const MissingFinalReturn = 'missing-final-return';
    export const DuplicateElements = 'duplicate-elements';
    export const IncompatibleTypes = 'incompatible-types';
}

/**
 * Implementation of custom validations.
 */
export class SmallJavaValidator {

    checkClassHierarchy(c: SJClass, accept: ValidationAcceptor): void {
        const hierarchy = util.classHierarchy(c);
        hierarchy.forEach(ref => {
            if (ref.ref?.name === c.name) {
                accept(
                    'error',
                    "cycle in hierarchy of class '" + c.name + "'",
                    {
                        node: c,
                        property: 'name',
                        code: IssueCodes.ClassHierarchy
                    }
                );
            }
        })
    }

    checkMemberSelection(sel: SJMemberSelection, accept: ValidationAcceptor): void {
        const member = sel.member;
        // let [ cond1, cond2 ] = [ isSJField(member.ref), sel.methodInvocation];
        // console.log(cond1);
        // console.log(cond2);
        if ( isSJField(member.ref) && sel.methodInvocation) {
            accept(
                'error',
                'Method invocation on a field',
                {
                    node: sel,
                    property: 'methodInvocation',
                    code: IssueCodes.MemberSelection
                }
            )
        } else if ( isSJMethod(member.ref) && !sel.methodInvocation) {
            accept(
                'error',
                'Field selection on a method',
                {
                    node: sel,
                    property: 'member',
                    code: IssueCodes.MemberSelection
                }
            )
        }
    }

    checkUnreachableCode(block: SJBlock, accept: ValidationAcceptor): void {
        const statements = block.statements;
        for (let i = 0; i < statements.length-1; i++) {
            if ( isSJReturn(statements[i]) ) {
                accept(
                    'error',
                    'Unreachable code',
                    {
                        node: statements[i+1],
                        index: 0,
                        code: IssueCodes.UnreachableCode
                    }
                )
            }
        }
    }

    checkMethodEndsWithReturn(method: SJMethod, accept: ValidationAcceptor): void {
        if (util.returnStatement(method) === undefined) {
            accept(
                'error',
                'Method must have a return statement',
                {
                    node: method,
                    property: 'body',
                    code: IssueCodes.MissingFinalReturn

                }
            )
        }
    }

    checkNoDuplicateClasses(program: SJProgram, accept: ValidationAcceptor): void {
        const extractor = (program: SJProgram) => stream(program.classes);
        this.checkUniqueName(program, accept, extractor, 'class');
    }

    checkNoDuplicateFields(program: SJProgram, accept: ValidationAcceptor): void {
        const extractor = (program: SJProgram) => stream(program.classes)
                                                    .flatMap(c => stream(c.members))
                                                    .filter(m => isSJField(m));
        this.checkUniqueName(program, accept, extractor, 'field');
    }

    checkNoDuplicateMethods(program: SJProgram, accept: ValidationAcceptor): void {
        const extractor = (program: SJProgram) => stream(program.classes)
                                                    .flatMap(c => stream(c.members))
                                                    .filter(m => isSJMethod(m));
        this.checkUniqueName(program, accept, extractor, 'method');
    }

    checkNoDuplicateParams(program: SJProgram, accept: ValidationAcceptor): void {
        const extractor = (program: SJProgram) => stream(program.classes)
                                                    .flatMap(c => stream(c.members))
                                                    .filter(m => isSJMethod(m))
                                                    .flatMap(m => stream((m as SJMethod).params));
        this.checkUniqueName(program, accept, extractor, 'parameter');
    }

    checkNoDuplicateVariables(body: SJBlock, accept: ValidationAcceptor): void {
        if ( isSJMethod(body.$container) ) {
            const allVariableDeclarations = streamAllContents(body).filter(isSJVariableDeclaration);
            const map = new MultiMap<string, { name: string } & AstNode>();
            allVariableDeclarations.forEach(e => map.add(e.name, e));
    
            for (const [, dupes] of map.entriesGroupedByKey()) {
                if (dupes.length > 1) {
                    dupes.forEach(e => {
                        accept('error', 'Duplicate ' + 'variable' + ' "' + e.name + '"', { node: e, property: 'name', code: IssueCodes.DuplicateElements });
                    });
                }
            }
        }
    }

    private checkUniqueName(program: SJProgram, accept: ValidationAcceptor, extractor: (program: SJProgram) => Stream<NamedAstNode>, uniqueObjName: string): void {
        const map = new MultiMap<string, { name: string } & AstNode>();
        extractor(program).forEach(e => map.add(e.name, e));

        for (const [, dupes] of map.entriesGroupedByKey()) {
            if (dupes.length > 1) {
                dupes.forEach(e => {
                    accept('error', 'Duplicate ' + uniqueObjName + ' "' + e.name + '"', { node: e, property: 'name', code: IssueCodes.DuplicateElements });
                });
            }
        }
    }

    // @Check def void checkConformance(SJExpression exp) {
	// 	val actualType = exp.typeFor
	// 	val expectedType = exp.expectedType
	// 	if (expectedType === null || actualType === null)
	// 		return; // nothing to check
	// 	if (!actualType.isConformant(expectedType)) {
	// 		error("Incompatible types. Expected '" + expectedType.name + "' but was '" + actualType.name + "'",
	// 			null, INCOMPATIBLE_TYPES);
	// 	}
	// }

    checkConformance(exp: SJExpression, accept: ValidationAcceptor): void {
        const actualType = SJcompute.typeFor(exp);
        const expectedType = SJcompute.expectedType(exp);
        if (!expectedType || !actualType) {
            return; 
        }
        if (!SJconform.isConformant(actualType as SJClass, expectedType as SJClass)) {
            accept(
                'error',
                'Incompatible types. Expected ' + (expectedType as SJClass).name + ' but was ' + (actualType as SJClass).name,
                {
                    node: exp,
                    property: 'expectedType',
                    code: IssueCodes.IncompatibleTypes
                }
            )
        }
    }

}