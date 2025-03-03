import React from 'react'
import create, { GetState, Mutate, SetState, StoreApi, UseStore } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { renderHook } from '@testing-library/react-hooks'
import { EditorStateContext, useSelectorWithCallback } from './store-hook'
import { createEditorState, EditorState, EditorStorePatched } from './editor-state'
import { NO_OP } from '../../../core/shared/utils'
import * as EP from '../../../core/shared/element-path'
import { shallowEqual } from '../../../core/shared/equality-utils'
import { createBuiltInDependenciesList } from '../../../core/es-modules/package-manager/built-in-dependencies-list'

function createEmptyEditorStoreHook() {
  let emptyEditorState = createEditorState(NO_OP)

  const initialEditorStore: EditorStorePatched = {
    editor: emptyEditorState,
    derived: null as any,
    strategyState: null as any,
    history: null as any,
    userState: null as any,
    workers: null as any,
    persistence: null as any,
    dispatch: null as any,
    alreadySaved: false,
    builtInDependencies: createBuiltInDependenciesList(null),
  }

  const storeHook = create<
    EditorStorePatched,
    SetState<EditorStorePatched>,
    GetState<EditorStorePatched>,
    Mutate<StoreApi<EditorStorePatched>, [['zustand/subscribeWithSelector', never]]>
  >(subscribeWithSelector((set) => initialEditorStore))

  return storeHook
}

const ContextProvider: React.FunctionComponent<{
  storeHook: UseStore<EditorStorePatched>
}> = ({ storeHook, children }) => {
  return (
    <EditorStateContext.Provider value={{ api: storeHook, useStore: storeHook }}>
      {children}
    </EditorStateContext.Provider>
  )
}

describe('useSelectorWithCallback', () => {
  it('The callback is not fired on first call', () => {
    const storeHook = createEmptyEditorStoreHook()

    let hookRenders = 0
    let callCount = 0

    const { result } = renderHook<{ storeHook: UseStore<EditorStorePatched> }, void>(
      (props) => {
        hookRenders++
        return useSelectorWithCallback(
          (store) => store.editor.selectedViews,
          (newSelectedViews) => {
            callCount++
          },
        )
      },
      {
        wrapper: ContextProvider,
        initialProps: {
          storeHook: storeHook,
        },
      },
    )

    expect(hookRenders).toEqual(1)
    expect(callCount).toEqual(0)
  })

  it('The callback is fired if the store changes', () => {
    const storeHook = createEmptyEditorStoreHook()

    let hookRenders = 0
    let callCount = 0

    const { result } = renderHook<{ storeHook: UseStore<EditorStorePatched> }, void>(
      (props) => {
        hookRenders++
        return useSelectorWithCallback(
          (store) => store.editor.selectedViews,
          (newSelectedViews) => {
            callCount++
          },
        )
      },
      {
        wrapper: ContextProvider,
        initialProps: {
          storeHook: storeHook,
        },
      },
    )

    storeHook.setState({
      editor: { selectedViews: [EP.fromString('sb/scene:aaa')] } as EditorState,
    })

    expect(hookRenders).toEqual(1)
    expect(callCount).toEqual(1)
  })

  it('The callback is fired if the hook is rerendered in a race condition and happens earlier than the zustand subscriber could be notified', () => {
    const storeHook = createEmptyEditorStoreHook()

    let hookRenders = 0
    let callCount = 0
    let hookRendersWhenCallbackWasFired = -1
    let callCountWhenCallbackWasFired = -1

    let rerenderTestHook: () => void

    storeHook.subscribe(
      (store) => store.editor.selectedViews,
      (newSelectedViews) => {
        if (newSelectedViews != null) {
          rerenderTestHook()
          callCountWhenCallbackWasFired = callCount
          hookRendersWhenCallbackWasFired = hookRenders
          // TODO this is super-baffling. turning this test async and putting done() here and expect()-ing values did not work for some reason
        }
      },
    )

    const { result, rerender } = renderHook<{ storeHook: UseStore<EditorStorePatched> }, void>(
      (props) => {
        hookRenders++
        return useSelectorWithCallback(
          (store) => store.editor.selectedViews,
          (newSelectedViews) => {
            callCount++
          },
        )
      },
      {
        wrapper: ContextProvider,
        initialProps: {
          storeHook: storeHook,
        },
      },
    )

    rerenderTestHook = () => {
      rerender({ storeHook: storeHook })
    }

    storeHook.setState({
      editor: { selectedViews: [EP.fromString('sb/scene:aaa')] } as EditorState,
    })

    storeHook.destroy()

    expect(hookRenders).toEqual(2)
    expect(hookRendersWhenCallbackWasFired).toEqual(2)
    expect(callCount).toEqual(1)
    expect(callCountWhenCallbackWasFired).toEqual(1)
  })
})
