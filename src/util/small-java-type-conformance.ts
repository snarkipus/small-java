import * as tc from './small-java-type-computer';
import { SJClass } from '../language-server/generated/ast';
import { classHierarchy } from './small-java-model-util';

export function isConformant(c1: SJClass, c2: SJClass): boolean {
    if ( c1 === tc.SmallJavaTypeComputer.NULL_TYPE || c1 === c2 || isSubclassOf(c1, c2) ) {
        return true;
    } else {
        return false;
    }
}

export function isSubclassOf(c1: SJClass, c2: SJClass): boolean {
    let classRefSet = classHierarchy(c1);
    return [...classRefSet].map(r => r.ref).includes(c2);
}
