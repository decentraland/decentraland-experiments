import root from '../window'

export const addEventListener = jest.spyOn(root, 'addEventListener')
export const dispatchEvent = jest.spyOn(root, 'dispatchEvent')
export const removeEventListener = jest.spyOn(root, 'removeEventListener')
