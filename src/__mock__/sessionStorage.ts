import root from '../window'

const { sessionStorage } = root

export const setItem = jest.spyOn(sessionStorage, 'setItem')
export const getItem = jest.spyOn(sessionStorage, 'getItem')
