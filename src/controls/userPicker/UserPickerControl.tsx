/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from 'react';

import { useAtom } from 'jotai';

import {
  Field,
  Input,
  PositioningImperativeRef,
} from '@fluentui/react-components';

import { globalState } from './atoms/globalState';
import { IUserPickerProps } from './IUserPickerProps';
import { PopUpMenu } from './PopUpMenu';
import { User } from './User';
import { useSelectUserStyles } from './useSelectuserStyles';

export const UserPickerControl: React.FunctionComponent<IUserPickerProps> = (props: IUserPickerProps) => {
  const { userSelectionLimit, label, required, validationMessage, messageType, onSelectedUsers, onRemoveSelectedUser, defaultSelectdUsers } = props;
  const buttonRef = React.useRef<HTMLInputElement>(null);
  const positioningRef = React.useRef<PositioningImperativeRef>(null);
  const [open, setOpen] = React.useState(false);
  const [appGlobalState, setAppGlobalState] = useAtom(globalState);
  const {  selectedUsers } = appGlobalState;
  const [searchUser, setSearchUser] = React.useState<string>("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  /*  const forceUpdate = React.useReducer(() => ({}), {})[1] as () => void; */

  const styles = useSelectUserStyles();
  console.log(styles);

  React.useEffect(() => {
    if (buttonRef.current) {
      positioningRef.current?.setTarget(buttonRef.current);
    }

  }, [buttonRef, positioningRef]);

 React.useEffect(() => {
    if (defaultSelectdUsers) {
      setAppGlobalState({ ...appGlobalState, selectedUsers: defaultSelectdUsers });
    }
 }, []);

  const hasSelectedUsers = React.useMemo(() => {
    if (selectedUsers.length > 0){
     if ( onSelectedUsers) onSelectedUsers(selectedUsers);
      return true;
    }
  }, [selectedUsers]);

  const showInput = React.useMemo(() => {
    return userSelectionLimit ? selectedUsers.length < userSelectionLimit : true;
  }, [selectedUsers, userSelectionLimit]);

  const onRemove = React.useCallback(
    (userId: string) => {
      const newUsers = selectedUsers.filter((user) => user.mail !== userId);
      const removedUser = selectedUsers.filter((user) => user.mail === userId);
      setAppGlobalState({ ...appGlobalState, selectedUsers: newUsers });
      onRemoveSelectedUser && onRemoveSelectedUser(removedUser[0]);
    },

    [selectedUsers]
  );

  const RenderSelectedUsers = React.useCallback((): JSX.Element => {

    return (
      <>
        {selectedUsers.map((user) => {
          return (
            <>
              <div className={styles.userItem} key={user.mail}>
                <User userId={user.mail ?? ""} onRemove={onRemove} />
              </div>
            </>
          );
        })}
      </>
    );
  }, [selectedUsers]);

  return (
    <>
    <div style={{width: '100%'}} ref={containerRef}>
      <Field
        label={label}
        required={required ?? false}
        validationMessage={validationMessage ?? undefined}
        validationState={messageType}
      >
        <div className={styles.selectUserMainContainer}>
          {hasSelectedUsers ? (

            <div className={styles.selectedUserContainer}>
              <RenderSelectedUsers />
            </div>
          ) : null}
          {showInput ? (
            <div className={styles.inputContainer}>
              <Input
                value={searchUser}
                appearance="underline"
                style={{ borderWidth: 0, width: "100%" }}
                ref={buttonRef}
                type="text"
                placeholder="enter user name"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  console.log(event.target.value);

                  if (event.target.value.length === 0) {
                    setSearchUser("");
                    setOpen(false);
                  } else {
                    setSearchUser(event.target.value);
                    if (event.target.value.length >= 2) {
                      setOpen(true);
                      buttonRef.current?.focus();
                    }
                  }
                }}
              />
              {open ? (
                <PopUpMenu
                 target={containerRef}
                  searchValue={searchUser}
                  isOpen={open}
                  onDismiss={(open: boolean) => {
                    setOpen(false);
                    setSearchUser("");
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </Field>
      </div>
    </>
  );
};
