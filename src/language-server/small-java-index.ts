import { SmallJavaNameProvider } from "./small-java-naming";
export class SmallJavaIndex {

    nameProvider = new SmallJavaNameProvider();

	// def getResourceDescription(EObject o) {
	// 	val index = rdp.getResourceDescriptions(o.eResource)
	// 	index.getResourceDescription(o.eResource.URI)
	// }

	// def getExportedEObjectDescriptions(EObject o) {
	// 	o.getResourceDescription.getExportedObjects
	// }

	// def getExportedClassesEObjectDescriptions(EObject o) {
	// 	o.getResourceDescription.getExportedObjectsByType(SmallJavaPackage.eINSTANCE.SJClass)
	// }    
}