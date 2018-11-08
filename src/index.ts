type TaskComputation<A, B> = (
  resolve: (value?: A) => void,
  reject: (reason?: B) => void
) => void

type SuccessCallback<A> = (a: A) => any
type ErrorCallback<B> = (b: B) => any
type PromiseCreator<A> = () => Promise<A>

const noop = (): any => undefined

export default class Task<A> {
  static empty() {
    return new Task(noop)
  }

  static of<A>(value: A): Task<A> {
    return new Task(resolve => {
      resolve(value)
    })
  }

  static rejected(reason?: any): Task<any> {
    return new Task((_, reject) => {
      reject(reason)
    })
  }

  static race<A>(tasks: Array<Task<A>>): Task<A> {
    return new Task((resolve, reject) => {
      let done = false
      const guard = (fn: (a: A) => any) => (x: A) => {
        if (!done) {
          done = true
          return fn(x)
        }
      }
      tasks.forEach(task => {
        task.fork(guard(resolve), guard(reject))
      })
    })
  }

  static parallel(tasks: Array<Task<any>>): Task<any[]> {
    return new Task((resolve, reject) => {
      const length = tasks.length
      const results = new Array(length)
      const resolved: Array<Task<any>> = []
      tasks.forEach((task, idx) => {
        task.fork(
          result => {
            results[idx] = result
            if (resolved.push(task) === length) {
              resolve(results)
            }
          },
          err => {
            reject(err)
          }
        )
      })
    })
  }

  static fromPromise<A>(promise: Promise<A> | PromiseCreator<A>): Task<A> {
    return new Task((resolve, reject) => {
      ;(typeof promise === 'function' ? promise() : promise).then(
        resolve,
        reject
      )
    })
  }

  computation: TaskComputation<A, any>

  constructor(computation: TaskComputation<A, any>) {
    this.computation = computation
  }

  fork(success: SuccessCallback<A>, error: ErrorCallback<any> = noop) {
    this.computation(success, error)
  }

  map<C>(fn: (a: A) => C): Task<C> {
    return new Task((resolve, reject) => {
      return this.fork((a: A) => resolve(fn(a)), b => reject(b))
    })
  }

  mapRejected<C>(fn: (a: A) => C): Task<A> {
    return new Task((resolve, reject) => {
      return this.fork((a: A) => resolve(a), b => reject(fn(b)))
    })
  }

  chain<C>(fn: (a: A) => Task<C>): Task<C> {
    return new Task((resolve, reject) => {
      return this.fork((a: A) => fn(a).fork(resolve, reject), b => reject(b))
    })
  }

  orElse<C>(fn: (a: A) => Task<C>): Task<C> {
    return new Task((resolve, reject) => {
      return this.fork(
        (a: A) => fn(a).fork(resolve, reject),
        b => fn(b).fork(resolve, reject)
      )
    })
  }

  concat(that: Task<A>): Task<A> {
    return Task.race([this, that])
  }

  toPromise(): Promise<A> {
    return new Promise((resolve, reject) => this.fork(resolve, reject))
  }
}
