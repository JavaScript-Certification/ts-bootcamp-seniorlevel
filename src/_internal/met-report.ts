// Tonight's report from the met office, as raw numbers. You do not need to modify this file.
export type MetReport = {
  readonly site: string
  /** the height of the lowest clouds, in feet, as aviation reports always give it */
  readonly cloudBaseFt: number
  readonly sunset: string
}

export const metReport: MetReport = {
  site: 'Riverside launch field',
  cloudBaseFt: 4000,
  sunset: '20:41',
}
