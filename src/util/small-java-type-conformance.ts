import * as tc from './small-java-type-computer';
import * as util from './small-java-model-util';
import { SJClass } from '../language-server/generated/ast';

export class SmallJavaTypeConformance {

    static isConformant(c1: SJClass, c2: SJClass): boolean {
        if ( c1 === tc.SmallJavaTypeComputer.NULL_TYPE || c1 === c2 || this.isSubclassOf(c1, c2) ) {
            return true;
        } else {
            return false;
        }
    }

    static isSubclassOf(c1: SJClass, c2: SJClass): boolean {
        let classRefSet = util.SmallJavaModeUtil.classHierarchy(c1);
        return [...classRefSet].map(r => r.ref).includes(c2);
    }
}