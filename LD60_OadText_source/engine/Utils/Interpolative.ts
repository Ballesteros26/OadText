//TODO zu interface
/*abstract class InterpolativeTODO {
	//TODO type muss der "endclass" zb COLOR entsprechen
	public abstract interpolate(from: InterpolativeTODO, to: InterpolativeTODO, time: number): InterpolativeTODO

}*/

//TODO eig so machen
/*
export default interface Interpolative {
	interpolate<T>(object: T, from: T, to: T, time: number): T;
}
*/

//Eig braucht man ne referenz zum zu tweenenden object
export default interface Interpolative {
	copy(): Interpolative;
	lerp(from: Interpolative, to: Interpolative, time: number): void; //: Interpolative;
}

//Eig braucht man ne referenz zum zu tweenenden object
/*export default interface Interpolative {
	copy<T>(this: T): T;
	lerp(from: Interpolative, to: Interpolative, time: number): void;//: Interpolative;
}*/
