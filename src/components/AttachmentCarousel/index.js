import React from 'react';
import {View, PixelRatio, Keyboard} from 'react-native';
import PropTypes from 'prop-types';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import {Parser as HtmlParser} from 'htmlparser2';
import styles from '../../styles/styles';
import * as ReportActionsUtils from '../../libs/ReportActionsUtils';
import * as DeviceCapabilities from '../../libs/DeviceCapabilities';
import CONST from '../../CONST';
import ONYXKEYS from '../../ONYXKEYS';
import reportActionPropTypes from '../../pages/home/report/reportActionPropTypes';
import tryResolveUrlFromApiRoot from '../../libs/tryResolveUrlFromApiRoot';
import withLocalize, {withLocalizePropTypes} from '../withLocalize';
import compose from '../../libs/compose';
import withWindowDimensions from '../withWindowDimensions';
import reportPropTypes from '../../pages/reportPropTypes';
import AttachmentCarouselView from './AttachmentCarouselView';

const propTypes = {
    /** source is used to determine the starting index in the array of attachments */
    source: PropTypes.string,

    /** Callback to update the parent modal's state with a source and name from the attachments array */
    onNavigate: PropTypes.func,

    /** Callback to close carousel when user swipes down (on native) */
    onClose: PropTypes.func,

    /** Object of report actions for this report */
    reportActions: PropTypes.objectOf(PropTypes.shape(reportActionPropTypes)),

    /** The report currently being looked at */
    report: reportPropTypes.isRequired,

    ...withLocalizePropTypes,
};

const defaultProps = {
    source: '',
    reportActions: {},
    onNavigate: () => {},
    onClose: () => {},
};

class AttachmentCarousel extends React.Component {
    constructor(props) {
        super(props);

        this.canUseTouchScreen = DeviceCapabilities.canUseTouchScreen();

        this.autoHideArrow = this.autoHideArrow.bind(this);
        this.cancelAutoHideArrow = this.cancelAutoHideArrow.bind(this);
        this.updatePage = this.updatePage.bind(this);
        this.toggleArrowsVisibility = this.toggleArrowsVisibility.bind(this);
        this.createInitialState = this.createInitialState.bind(this);

        this.state = this.createInitialState();
    }

    componentDidMount() {
        this.autoHideArrow();
    }

    /**
     * On a touch screen device, automatically hide the arrows
     * if there is no interaction for 3 seconds.
     */
    autoHideArrow() {
        if (!this.canUseTouchScreen) {
            return;
        }
        this.cancelAutoHideArrow();
        this.autoHideArrowTimeout = setTimeout(() => {
            this.toggleArrowsVisibility(false);
        }, CONST.ARROW_HIDE_DELAY);
    }

    /**
     * Cancels the automatic hiding of the arrows.
     */
    cancelAutoHideArrow() {
        clearTimeout(this.autoHideArrowTimeout);
    }

    /**
     * Toggles the visibility of the arrows
     * @param {Boolean} shouldShowArrow
     * @param {Boolean} isGestureInUse
     */
    toggleArrowsVisibility(shouldShowArrow, isGestureInUse = false) {
        // Don't toggle arrows in a zoomed state
        if (isGestureInUse) {
            return;
        }
        this.setState(
            (current) => {
                const newShouldShowArrow = _.isBoolean(shouldShowArrow) ? shouldShowArrow : !current.shouldShowArrow;
                return {shouldShowArrow: newShouldShowArrow};
            },
            () => {
                if (this.state.shouldShowArrow) {
                    this.autoHideArrow();
                } else {
                    this.cancelAutoHideArrow();
                }
            },
        );
    }

    /**
     * Constructs the initial component state from report actions
     * @returns {{page: Number, attachments: Array, shouldShowArrow: Boolean, containerWidth: Number}}
     */
    createInitialState() {
        const actions = [ReportActionsUtils.getParentReportAction(this.props.report), ...ReportActionsUtils.getSortedReportActions(_.values(this.props.reportActions))];
        const attachments = [];

        const htmlParser = new HtmlParser({
            onopentag: (name, attribs) => {
                if (name !== 'img' || !attribs.src) {
                    return;
                }

                const expensifySource = attribs[CONST.ATTACHMENT_SOURCE_ATTRIBUTE];

                // By iterating actions in chronological order and prepending each attachment
                // we ensure correct order of attachments even across actions with multiple attachments.
                attachments.unshift({
                    source: tryResolveUrlFromApiRoot(expensifySource || attribs.src),
                    isAuthTokenRequired: Boolean(expensifySource),
                    file: {name: attribs[CONST.ATTACHMENT_ORIGINAL_FILENAME_ATTRIBUTE]},
                });
            },
        });

        _.forEach(actions, (action) => htmlParser.write(_.get(action, ['message', 0, 'html'])));
        htmlParser.end();

        const page = _.findIndex(attachments, (a) => a.source === this.props.source);
        if (page === -1) {
            throw new Error('Attachment not found');
        }

        return {
            page,
            attachments,
            shouldShowArrow: this.canUseTouchScreen,
            containerWidth: 0,
            containerHeight: 0,
            activeSource: null,
        };
    }

    /**
     * Updates the page state when the user navigates between attachments
     * @param {Object} item
     * @param {number} index
     */
    updatePage({item, index}) {
        Keyboard.dismiss();

        if (!item) {
            // eslint-disable-next-line react/no-unused-state
            this.setState({activeSource: null});
            return;
        }

        const page = index;
        this.props.onNavigate(item);
        // eslint-disable-next-line react/no-unused-state
        this.setState({page, activeSource: item.source});
    }

    render() {
        return (
            <View
                style={[styles.attachmentModalArrowsContainer, styles.flex1]}
                onLayout={({nativeEvent}) =>
                    // eslint-disable-next-line react/no-unused-state
                    this.setState({containerWidth: PixelRatio.roundToNearestPixel(nativeEvent.layout.width), containerHeight: PixelRatio.roundToNearestPixel(nativeEvent.layout.height)})
                }
            >
                <AttachmentCarouselView
                    carouselState={this.state}
                    updatePage={this.updatePage}
                    toggleArrowsVisibility={this.toggleArrowsVisibility}
                    autoHideArrow={this.autoHideArrow}
                    cancelAutoHideArrow={this.cancelAutoHideArrow}
                    onClose={this.props.onClose}
                />
            </View>
        );
    }
}

AttachmentCarousel.propTypes = propTypes;
AttachmentCarousel.defaultProps = defaultProps;

export default compose(
    withOnyx({
        reportActions: {
            key: ({report}) => `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.reportID}`,
            canEvict: false,
        },
    }),
    withLocalize,
    withWindowDimensions,
)(AttachmentCarousel);
