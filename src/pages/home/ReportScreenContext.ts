import {createContext, RefObject} from 'react';
import {FlatList, GestureResponderEvent, View} from 'react-native';

type ReactionListAnchor = View | HTMLDivElement | null;

type ReactionListEvent = GestureResponderEvent | MouseEvent;

type ReactionListRef = {
    showReactionList: (event: ReactionListEvent | undefined, reactionListAnchor: ReactionListAnchor, emojiName: string, reportActionID: string) => void;
    hideReactionList: () => void;
    isActiveReportAction: (actionID: number | string) => boolean;
};

type FlatListRefType = RefObject<FlatList<unknown>> | null;

type ActionListContextType = {
    flatListRef: FlatListRefType;
    scrollPosition: {offset: number} | null;
    setScrollPosition: (position: {offset: number}) => void;
};
type ReactionListContextType = RefObject<ReactionListRef> | null;

const ActionListContext = createContext<ActionListContextType>({flatListRef: null, scrollPosition: null, setScrollPosition: () => {}});
const ReactionListContext = createContext<ReactionListContextType>(null);

export {ActionListContext, ReactionListContext};
export type {ReactionListRef, ActionListContextType, ReactionListContextType, FlatListRefType, ReactionListAnchor, ReactionListEvent};
