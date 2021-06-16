const express = require("express");
const router = express.Router({ mergeParams: true });
const catchAsync = require("../utils/catchAsync");
const Chat = require("../models/chat");
const User = require("../models/user");
var io;

router.use((req, res, next) => {
    io = req.io;
    next();
});

router.get(
    "/",
    catchAsync(async (req, res) => {
        const receiverID = "";
        const chatID = "";
        const userID = req.user._id;
        const user = await User.findById(req.user._id)
            .populate({
                path: "inbox",
                populate: {
                    path: "user2",
                },
            })
            .populate({
                path: "inbox",
                populate: {
                    path: "user1",
                },
            });
        let Items = get_ConversationList_conversation(user, receiverID);
        let conversationList = Items.conversationList;
        let conversation = Items.conversation;
        let receiver = Items.Receiver;

        res.render("inbox/inbox.ejs", {
            receiverID,
            chatID,
            userID,
            conversationList,
            conversation,
            receiver,
        });
    })
);

router.get(
    "/getlist",
    catchAsync(async (req, res) => {
        const user = await User.findById(req.user._id)
            .populate({
                path: "inbox",
                populate: {
                    path: "user2",
                },
            })
            .populate({
                path: "inbox",
                populate: {
                    path: "user1",
                },
            });
        res.send({ user });
    })
);

router.get(
    "/:toUserId",
    catchAsync(async (req, res) => {
        const receiverID = req.params.toUserId;
        // console.log(receiverID);
        // checking validity of receiverID
        try {
            await User.findById(receiverID);
        } catch {
            req.flash("error", "requested user is not found.");
            res.redirect("/hotels/inbox");
        }

        //chat is present or not
        var u1 = receiverID.toString();
        var u2 = req.user._id.toString();

        if (u1 === u2) {
            //if receiver and sender is same => error
            req.flash("error", "invalid request.");
            res.redirect("/hotels/inbox");
        } else {
            var chat = await Chat.findOne({ user1: u1, user2: u2 });
            if (!chat) chat = await Chat.findOne({ user1: u2, user2: u1 });

            //if chat is not their
            if (!chat) {
                chat = new Chat({ user1: u1, user2: u2 });
                await chat.save();
                const user1 = await User.findById(u1);
                const user2 = await User.findById(u2);
                user1.inbox.push(chat);
                user2.inbox.push(chat);
                await user1.save();
                await user2.save();
            }
            const chatID = chat._id;
            const userID = req.user._id;
            const user = await User.findById(req.user._id)
                .populate({
                    path: "inbox",
                    populate: {
                        path: "user2",
                    },
                })
                .populate({
                    path: "inbox",
                    populate: {
                        path: "user1",
                    },
                });
            let Items = get_ConversationList_conversation(user, receiverID);
            let conversationList = Items.conversationList;
            let conversation = Items.conversation;
            let receiver = Items.Receiver;

            // console.log(receiver);
            // conversationList.forEach((item) => console.log(item));
            // conversation.forEach((item) => console.log(item));

            res.render("inbox/inbox.ejs", {
                receiverID,
                chatID,
                userID,
                conversationList,
                conversation,
                receiver,
            });
        }
    })
);
function get_ConversationList_conversation(user, receiverID) {
    user.inbox.sort(function (a, b) {
        return a.updatedAt > b.updatedAt
            ? -1
            : a.updatedAt < b.updatedAt
            ? 1
            : 0;
    });
    let conversationList = [];
    let conversation = [];
    let Receiver;
    function getReceiver(chat) {
        const u1_id = chat.user1._id.toString();
        return u1_id === user._id.toString() ? chat.user2 : chat.user1;
    }
    function getRecentMessage(chat) {
        return chat.messages.length > 0
            ? chat.messages[chat.messages.length - 1].body
            : "";
    }
    function getProfileImage(receiver) {
        return receiver.profileImage.url
            ? receiver.profileImage.url
            : "https:img.icons8.com/metro/26/000000/user-male.png";
    }
    function getConversationListItem(receiver, chat) {
        // const UpdatedAt = "date";
        updatedAt = getUpdatedDate(chat.updatedAt);
        const recent_message = getRecentMessage(chat);
        const profileImage = getProfileImage(receiver);

        let conversationListItem = {
            receiverName: receiver.username,
            receiverId: receiver._id,
            profileImage: profileImage,
            updatedAt: updatedAt,
            recent_message: recent_message,
            unReadCount: 0,
        };
        return conversationListItem;
    }
    function getConversation(receiver, chat) {
        chat.messages.forEach((messageObj) => {
            let message_class =
                messageObj.sender._id.toString() == receiver._id.toString()
                    ? "other-message"
                    : "you-message";
            let message = {
                message_text: messageObj.body,
                sender: messageObj.sender,
                message_class: message_class,
                isRead: 1,
                message_time: "",
            };
            conversation.push(message);
        });
    }

    user.inbox.forEach((chat, index) => {
        const receiver = getReceiver(chat);
        let conversationListItem = getConversationListItem(receiver, chat);
        conversationList.push(conversationListItem);
        if (receiver._id == receiverID) {
            getConversation(receiver, chat);
            Receiver = receiver;
        }
    });

    return { conversationList, conversation, Receiver };
}

function getUpdatedDate(date) {
    //https://stackoverflow.com/questions/27012854/change-iso-date-string-to-date-object-javascript
    function isoFormatDMY(d) {
        function pad(n) {
            return (n < 10 ? "0" : "") + n;
        }
        return (
            pad(d.getUTCDate()) +
            "/" +
            pad(d.getUTCMonth() + 1) +
            "/" +
            d.getUTCFullYear()
        );
    }
    return isoFormatDMY(date);
}
router.post(
    "/sendMessage",
    catchAsync(async (req, res) => {
        const { message_text, receiverID, chatID } = req.body;

        const msg = {
            body: message_text,
            sender: req.user._id,
        };

        await Chat.findByIdAndUpdate(
            { _id: chatID },
            { $push: { messages: msg } }
        );

        let profileImage = req.user.profileImage.url
            ? req.user.profileImage.url
            : "https:img.icons8.com/metro/26/000000/user-male.png";
        let message = {
            message_text: message_text,
            senderId: req.user._id,
            message_class: "other-message",
            profileImage: profileImage,
            message_time: "",
        };
        
        io.sockets.in(receiverID).emit("message", message);

        res.status(204).send();
    })
);

module.exports = router;
