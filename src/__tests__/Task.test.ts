import Task from '../index'

describe('Tasks', () => {
  test('Can create an empty task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.empty()
    task.fork(resolve, reject)

    expect(resolve).not.toHaveBeenCalled()
    expect(reject).not.toHaveBeenCalled()
  })

  test('Can create a task of value', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.of(true)
    task.fork(resolve, reject)

    expect(resolve).toHaveBeenCalledWith(true)
    expect(reject).not.toHaveBeenCalled()
  })

  test('Can create a rejected task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.rejected(true)
    task.fork(resolve, reject)

    expect(resolve).not.toHaveBeenCalled()
    expect(reject).toHaveBeenCalledWith(true)
  })

  test('Can create a task from a promise', () => {
    Task.fromPromise(Promise.resolve('a')).fork(x => {
      expect(x).toBe('a')
    })

    Task.fromPromise(Promise.reject('b')).fork(
      () => undefined,
      err => {
        expect(err).toBe('b')
      }
    )

    Task.fromPromise(
      new Promise(resolve => setTimeout(() => resolve('a'), 50))
    ).fork(x => {
      expect(x).toBe('a')
    })
  })

  test('Can create a task from a promise creator', () => {
    Task.fromPromise(() => Promise.resolve('a')).fork(x => {
      expect(x).toBe('a')
    })
  })

  test('Can create a promise from a task', async () => {
    const task = Task.of('a')

    const x = await task.toPromise()

    expect(x).toBe('a')
  })

  test('Can map a successful task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.of('a')
    task.map(v => v.toUpperCase()).fork(resolve, reject)

    expect(resolve).toHaveBeenCalledWith('A')
    expect(reject).not.toHaveBeenCalled()
  })

  test('Does not map a failed task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.rejected('a')
    task.map(v => v.toUpperCase()).fork(resolve, reject)

    expect(resolve).not.toHaveBeenCalled()
    expect(reject).toHaveBeenCalledWith('a')
  })

  test('Can map the rejected value of a failed task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.rejected('a')
    task.mapRejected(v => v.toUpperCase()).fork(resolve, reject)

    expect(resolve).not.toHaveBeenCalled()
    expect(reject).toHaveBeenCalledWith('A')
  })

  test('Can chain a successful task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.of('a')

    task.chain(v => Task.of(v.toUpperCase())).fork(resolve, reject)

    expect(resolve).toHaveBeenCalledWith('A')
    expect(reject).not.toHaveBeenCalled()
  })

  test('Does not chain a failed task', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.rejected('a')

    task.chain(v => Task.of(v.toUpperCase())).fork(resolve, reject)

    expect(resolve).not.toHaveBeenCalled()
    expect(reject).toHaveBeenCalledWith('a')
  })

  test('Can chain a multiple tasks', async () => {
    const addValue = jest.fn(x => x)
    const task1 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve(addValue('a'))
      }, 60)
    })
    const task2 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve(addValue('b'))
      }, 40)
    })
    const task3 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve(addValue('c'))
      }, 20)
    })

    await task1
      .chain(() => task2)
      .chain(() => task3)
      .toPromise()

    expect(addValue.mock.calls).toEqual([['a'], ['b'], ['c']])
  })

  test('Can recover from a failed task with orElse', () => {
    const resolve = jest.fn()
    const reject = jest.fn()
    const task = Task.rejected('a')

    task.orElse(v => Task.of(v.toUpperCase())).fork(resolve, reject)

    expect(resolve).toHaveBeenCalledWith('A')
    expect(reject).not.toHaveBeenCalled()
  })

  test('Can concat a task', async () => {
    const task1 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('a')
      }, 60)
    })
    const task2 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('b')
      }, 40)
    })

    const task = task1.concat(task2)
    const result = await task.toPromise()

    expect(result).toBe('b')
  })

  test('Can race tasks', async () => {
    const task1 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('a')
      }, 60)
    })
    const task2 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('b')
      }, 40)
    })
    const task3 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('c')
      }, 20)
    })

    const result = await Task.race([task1, task2, task3]).toPromise()

    expect(result).toBe('c')
  })

  test('Can create parallel tasks', async () => {
    const task1 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('a')
      }, 60)
    })
    const task2 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('b')
      }, 40)
    })
    const task3 = new Task((resolve, _) => {
      setTimeout(() => {
        resolve('c')
      }, 20)
    })

    const result = await Task.parallel([task1, task2, task3]).toPromise()

    expect(result).toEqual(['a', 'b', 'c'])
  })
})
