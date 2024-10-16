/* eslint-disable require-atomic-updates */
import * as React from "react";

import strings from "ControlStrings";
import { useAtomValue } from "jotai";

/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  Image,
  mergeClasses,
  Spinner,
  tokens,
} from "@fluentui/react-components";

import { contextState } from "./atoms/contextState";
import { IMG_SUPPORTED_EXTENSIONS } from "./constants/constants";
import { useGraphAPI } from "./hooks/useGrapAPI";
import { useSpAPI } from "./hooks/useSpAPI";
import { useUtils } from "./hooks/useUtils";
import { IFilePickerResult } from "./IFilePickerResult";
import { ISearchImagesResult } from "./models/ISearchImagesResult";
import { RenderHeader } from "./renderHeader/RenderHeader";
import { SelectStockImage } from "./SelectStokImage";
import { UploadImageFiles } from "./Upload";
import { useImagePickerStyles } from "./useImagePickerStyles";

export interface ISelectFromSharePointProps {
  onFileSelected: (file: IFilePickerResult) => void;
  isOpen: boolean;
  onDismiss: (refresh: boolean) => void;
}

const TENANT_NAME = window.location.hostname;
const SOURCE_SHAREPOINT = `AND -path:https://*my.sharepoint.com`;
const SOURCE_ONEDRIVE = `AND  path:https://*my.sharepoint.com`;
const SOURCE_STOCK = `stockImages`;
const SOURCE_UPLOAD = `upload`;

const acceptableExtensions: string[] = IMG_SUPPORTED_EXTENSIONS.split(",");
const queryExtensions = acceptableExtensions.map((ext) => `*${ext}`).join(" OR ");

const PAGE_ITEMS = 50;

export const SelectFromSharePoint: React.FunctionComponent<ISelectFromSharePointProps> = (
  props: React.PropsWithChildren<ISelectFromSharePointProps>
) => {
  const { isOpen, onDismiss, onFileSelected } = props;
  const [isAdding] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<ISearchImagesResult[]>([]);
  const appContext = useAtomValue(contextState);
  const { context } = appContext;
  const { searchImages } = useGraphAPI(context);
  const { downLoadSpOrOneDriveContent } = useSpAPI(context);
  const [selectedImage, setSelectedImage] = React.useState<ISearchImagesResult | null>(null);
  const refSelectedImage = React.useRef<ISearchImagesResult | null>(null);

  const isScrolling = React.useRef(false);
  const styles = useImagePickerStyles();
  const [isLoading, setIsLoading] = React.useState(false);
  const [source, setSource] = React.useState<string>(SOURCE_SHAREPOINT);
  const { getFileNameFromUrl, getFileNameWithoutExtension, getScrollPosition } = useUtils();
  const refStart = React.useRef(0);
  const refHasMore = React.useRef(false);

  const hasSelectedImage = React.useMemo(() => {
    return selectedImage !== null;
  }, [selectedImage]);

  const getMoreResultsSearch = React.useCallback(async () => {
    if (source === SOURCE_STOCK || source === SOURCE_UPLOAD) return;
    if (!refHasMore.current) return;
    refStart.current = refStart.current + PAGE_ITEMS;
    const results = await searchImages(`(${queryExtensions}) ${source}`, refStart.current);
    const { fields, hasMoreResults } = results;
    refHasMore.current = hasMoreResults;
    setSearchResults((prev) => [...prev, ...fields]);
  }, [searchImages, source]);

  React.useEffect(() => {
    (async () => {
      if (source === SOURCE_STOCK || source === SOURCE_UPLOAD) return;
      setIsLoading(true);
      setSelectedImage(null);
      refStart.current = 0;
      const results = await searchImages(`(${queryExtensions}) ${source}`, refStart.current);
      const { fields, hasMoreResults } = results;
      refHasMore.current = hasMoreResults;
      setSearchResults(fields);
      setIsLoading(false);
    })();
  }, [source]);

  const onSelectFile = React.useCallback(() => {
    if (!refSelectedImage.current) return;
    const { defaultEncodingURL, driveId, id, filename } = refSelectedImage.current;
    const fileresult: IFilePickerResult = {
      downloadFileContent: () => {
        return downLoadSpOrOneDriveContent(driveId, id, filename);
      },
      fileAbsoluteUrl: defaultEncodingURL,
      fileName: getFileNameFromUrl(defaultEncodingURL),
      fileNameWithoutExtension: getFileNameWithoutExtension(defaultEncodingURL),
      previewDataUrl: `https://${TENANT_NAME}/_api/v2.0/drives/${driveId}/items/${id}/thumbnails/0/large/content?preferNoRedirect=true`,
    } as IFilePickerResult;
    onFileSelected(fileresult);
    onDismiss(true);
  }, [
    downLoadSpOrOneDriveContent,
    onDismiss,
    onFileSelected,
    selectedImage,
    getFileNameFromUrl,
    getFileNameWithoutExtension,
  ]);

  const renderDialogActions = React.useMemo(() => {
    return (
      <>
        <Button disabled={!hasSelectedImage} appearance="primary" onClick={() => onSelectFile()}>
          {strings.ImagePickderSelectLabel}
        </Button>
        <Button onClick={() => onDismiss(false)} disabled={isAdding}>
          {strings.ImagePickerCancelLabel}
        </Button>
      </>
    );
  }, [isAdding, hasSelectedImage, onDismiss]);

  const onSourceSelected = React.useCallback(
    (source: "sharePoint" | "onDrive" | "stockImage" | "upload") => {
      switch (source) {
        case "sharePoint":
          setSource(SOURCE_SHAREPOINT);
          break;
        case "onDrive":
          setSource(SOURCE_ONEDRIVE);
          break;
        case "stockImage":
          setSource(SOURCE_STOCK);
          break;
        case "upload":
          setSource("upload");
          break;
      }
    },
    [setSource]
  );

  const onScroll = React.useCallback(async (ev) => {
    const scrollposition = getScrollPosition(ev.target);
    if (scrollposition > 98 && !isScrolling.current) {
      isScrolling.current = true;
      await getMoreResultsSearch();
      isScrolling.current = false;
    }
  }, []);

  const renderSharepointOrOnDriveImages = React.useCallback(() => {
    return (
      <div className={styles.grid} onScroll={onScroll}>
        {searchResults.map((item) => {
          return (
            <Image
              key={item.id}
              src={`https://${TENANT_NAME}/_api/v2.0/drives/${item.driveId}/items/${item.id}/thumbnails/0/medium/content?preferNoRedirect=true`}
              alt={item.title}
              style={{  height: "100px" }}
              fit="cover"
              className={mergeClasses(styles.image, selectedImage === item && styles.selectedImage)}
              onClick={() => {
                refSelectedImage.current = item;
                setSelectedImage(item);
              }}
            />
          );
        })}
      </div>
    );
  }, [searchResults, selectedImage, styles, TENANT_NAME]);

  const renderSelectedImage = React.useCallback(() => {
    switch (source) {
      case SOURCE_SHAREPOINT:
      case SOURCE_ONEDRIVE:
        return renderSharepointOrOnDriveImages();
      case SOURCE_STOCK:
        return (
          <SelectStockImage
            onFileSelected={(file: IFilePickerResult) => {
              onFileSelected(file);
              onDismiss(true);
            }}
            onCancel={() => onDismiss(false)}
            context={context}
          />
        );
      case "upload":
        return (
          <>
            <UploadImageFiles
              context={context}
              onSelectedFile={(file) => {
                refSelectedImage.current = file;
                setSelectedImage(file);
              }}
            />
          </>
        );
    }
  }, [source, renderSharepointOrOnDriveImages, context, onDismiss, onFileSelected]);

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} modalType="modal">
        <DialogSurface style={{ backgroundColor: tokens.colorNeutralBackground2 }}>
          <RenderHeader
            title={strings.ImagePickderSelectLabel}
            description={strings.ImagePickerPanelHeaderText}
            icon={"guidance:tools"}
            onDismiss={onDismiss}
          />
          <DialogBody style={{ gap: 0 }}>
            <DialogContent style={{ marginBottom: 15, minHeight: 500 }}>
              <div className={styles.toolbarContainer}>
                <Button
                  appearance={source === SOURCE_SHAREPOINT ? "primary" : "secondary"}
                  shape="circular"
                  onClick={() => onSourceSelected("sharePoint")}
                >
                 {strings.ImagePickerSharePointTabLabel}
                </Button>
                <Button
                  appearance={source === SOURCE_ONEDRIVE ? "primary" : "secondary"}
                  shape="circular"
                  onClick={() => onSourceSelected("onDrive")}
                >
                  {strings.ImagePickerOneDriveTabLabel}
                </Button>
                <Button
                  appearance={source === SOURCE_STOCK ? "primary" : "secondary"}
                  shape="circular"
                  onClick={() => onSourceSelected("stockImage")}
                >
                  {strings.ImagePickerStockImagesTabLabel}
                </Button>
                <Button
                  appearance={source === SOURCE_UPLOAD ? "primary" : "secondary"}
                  shape="circular"
                  onClick={() => onSourceSelected("upload")}
                >
                  {strings.ImagePickerUploadTabLabel}
                </Button>
              </div>
              {isLoading ? <Spinner style={{ paddingTop: 60 }} /> : renderSelectedImage()}
            </DialogContent>
            {source !== SOURCE_STOCK && (
              <DialogActions fluid position="end" style={{ marginTop: 10 }}>
                {renderDialogActions}
              </DialogActions>
            )}
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};